"use client";
import React, { useState, useCallback, useRef, useEffect } from "react";

// Ghi chú: Component này dựa vào thư viện SheetJS (XLSX) và JSZip.
// Chúng sẽ được tự động tải về từ CDN khi component được khởi tạo.

// Khai báo type cho các biến toàn cục để TypeScript không báo lỗi.
declare global {
  interface Window {
    XLSX: any;
    JSZip: any;
  }
}


// Định nghĩa kiểu dữ liệu cho kết quả xử lý file
interface ProcessedFileResult {
  originalFile: File;
  fileName: string;
  originalSize: number;
  processedSize: number;
  reduction: number;
  status: string;
  processedBlob: Blob | null;
  hasError: boolean;
}

// Component Icon cho các thẻ thông tin
const InfoCardIcon = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xl mr-3 text-cyan-500">{children}</div>
);

// Component chính
export default function ExcelCleanerTool() {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFileResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [libsLoaded, setLibsLoaded] = useState(false);
  const [libsError, setLibsError] = useState<string | null>(null);

  // Tự động tải thư viện từ CDN khi component được mount
  useEffect(() => {
    // Nếu thư viện đã tồn tại, không cần tải lại
    if (window.XLSX && window.JSZip) {
      setLibsLoaded(true);
      return;
    }

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
      });
    };

    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')
    ]).then(() => {
      setLibsLoaded(true);
      console.log("SheetJS and JSZip libraries loaded successfully.");
    }).catch(error => {
      console.error(error);
      setLibsError("Không thể tải các thư viện cần thiết. Vui lòng làm mới trang.");
      showMessage('error', "Lỗi tải tài nguyên, vui lòng thử lại.")
    });
  }, []);

  // Hàm hiển thị thông báo và tự động ẩn
  const showMessage = (type: "success" | "error", text: string, duration = 5000) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), duration);
  };

  // Hàm định dạng kích thước file
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  /**
   * Dọn dẹp định dạng từ các ô trống trong worksheet.
   * Chỉ xóa các cell chỉ chứa định dạng mà không có giá trị hay công thức.
   */
  const cleanEmptyFormatting = (worksheet: any) => {
      const XLSX = window.XLSX;
      if (!worksheet || !worksheet['!ref']) {
          return { changed: false, cleanedCells: 0 };
      }
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      let cleanedCells = 0;
      let changed = false;

      for (let r = range.s.r; r <= range.e.r; r++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
              const address = XLSX.utils.encode_cell({ r, c });
              const cell = worksheet[address];
              if (cell && (cell.v === undefined || cell.v === null || cell.v === '') && (!cell.f)) {
                  delete worksheet[address];
                  cleanedCells++;
                  changed = true;
              }
          }
      }
      
      // Cập nhật lại range của sheet một cách an toàn sau khi xóa
      if (changed) {
        const newRange = { s: { r: Infinity, c: Infinity }, e: { r: 0, c: 0 } };
        let hasCells = false;
        Object.keys(worksheet).forEach(key => {
          if (key[0] === '!') return;
          hasCells = true;
          const cell = XLSX.utils.decode_cell(key);
          newRange.s.r = Math.min(newRange.s.r, cell.r);
          newRange.s.c = Math.min(newRange.s.c, cell.c);
          newRange.e.r = Math.max(newRange.e.r, cell.r);
          newRange.e.c = Math.max(newRange.e.c, cell.c);
        });
        
        if (!hasCells) {
          worksheet['!ref'] = 'A1'; // Sheet rỗng
        } else {
          worksheet['!ref'] = XLSX.utils.encode_range(newRange);
        }
      }
      return { changed, cleanedCells };
  };

  /**
   * Xử lý từng file Excel.
   * @param file File Excel cần xử lý
   */
  const processExcelFile = async (file: File): Promise<ProcessedFileResult> => {
    const XLSX = window.XLSX;
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                
                let changesMade = false;
                let processingLog = [];

                // 1. Dọn dẹp định dạng ô trống
                Object.keys(workbook.Sheets).forEach(sheetName => {
                    const cleanResult = cleanEmptyFormatting(workbook.Sheets[sheetName]);
                    if (cleanResult.changed) {
                        changesMade = true;
                        processingLog.push(`${sheetName}: Dọn ${cleanResult.cleanedCells} ô trống`);
                    }
                });

                // 2. Dọn dẹp Named Ranges không hợp lệ
                if (workbook.Workbook && workbook.Workbook.Names) {
                    const originalCount = workbook.Workbook.Names.length;
                    workbook.Workbook.Names = workbook.Workbook.Names.filter((name: any) => name && name.Ref && !name.Ref.includes('#REF!'));
                    const removedCount = originalCount - workbook.Workbook.Names.length;
                    if (removedCount > 0) {
                        changesMade = true;
                        processingLog.push(`Xóa ${removedCount} named range lỗi`);
                    }
                }

                let processedBlob: Blob | null = null;
                let processedSize = file.size;

                if (changesMade) {
                    const processedData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true });
                    processedBlob = new Blob([processedData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    processedSize = processedBlob.size;
                }

                const reduction = file.size > 0 ? ((file.size - processedSize) / file.size * 100) : 0;
                let status = 'File đã tối ưu';
                if (changesMade && reduction >= 1) {
                  status = processingLog.join('; ');
                } else if (!changesMade) {
                  processedBlob = null; // Không có thay đổi, không cần tạo file mới
                  processedSize = file.size;
                }

                resolve({
                    originalFile: file, fileName: file.name, originalSize: file.size,
                    processedSize, reduction: Math.max(0, reduction), status, processedBlob, hasError: false,
                });

            } catch (error: any) {
                resolve({
                    originalFile: file, fileName: file.name, originalSize: file.size, processedSize: file.size,
                    reduction: 0, status: `Lỗi: ${error.message}`, processedBlob: null, hasError: true,
                });
            }
        };
        reader.onerror = () => {
             resolve({
                originalFile: file, fileName: file.name, originalSize: file.size, processedSize: file.size,
                reduction: 0, status: 'Lỗi không thể đọc file', processedBlob: null, hasError: true,
            });
        };
        reader.readAsArrayBuffer(file);
    });
  };

  /**
   * Hàm chính điều phối việc xử lý nhiều file.
   * @param files Danh sách file từ input hoặc drag-drop
   */
  const handleProcessFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!libsLoaded) {
        showMessage('error', 'Thư viện xử lý file chưa sẵn sàng, vui lòng thử lại sau giây lát.');
        return;
    }
    
    const excelFiles = Array.from(files).filter(file => file.name.endsWith('.xlsx') || file.name.endsWith('.xls'));
    if (excelFiles.length === 0) {
        showMessage('error', 'Vui lòng chỉ chọn file Excel (.xlsx, .xls)');
        return;
    }

    setIsProcessing(true);
    setProcessedFiles([]);
    setMessage(null);
    const results: ProcessedFileResult[] = [];

    for (let i = 0; i < excelFiles.length; i++) {
        const file = excelFiles[i];
        setProgress(((i + 1) / excelFiles.length) * 100);
        setStatusText(`Đang xử lý: ${file.name} (${i + 1}/${excelFiles.length})`);
        const result = await processExcelFile(file);
        results.push(result);
    }

    setProcessedFiles(results);
    setIsProcessing(false);
    setStatusText(`Hoàn tất! Đã xử lý ${excelFiles.length} file.`);
    showMessage('success', `Đã xử lý xong ${excelFiles.length} file.`);
  }, [libsLoaded]);

  // Xử lý sự kiện Drag & Drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-cyan-500', 'scale-105');
    handleProcessFiles(e.dataTransfer.files);
  }, [handleProcessFiles]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('border-cyan-500', 'scale-105');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-cyan-500', 'scale-105');
  };

  // Tải file đơn lẻ
  const handleDownload = (result: ProcessedFileResult) => {
    if (!result.processedBlob) return;
    const url = URL.createObjectURL(result.processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName.replace(/\.(xlsx|xls)$/i, '_cleaned.$1');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Tải tất cả dưới dạng ZIP
  const handleDownloadAll = async () => {
    const JSZip = window.JSZip;
    const zip = new JSZip();
    let fileCount = 0;
    processedFiles.forEach(result => {
        if (result.processedBlob) {
            const fileName = result.fileName.replace(/\.(xlsx|xls)$/i, '_cleaned.$1');
            zip.file(fileName, result.processedBlob);
            fileCount++;
        }
    });
    
    if (fileCount > 0) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'excel_cleaned_files.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        showMessage('error', 'Không có file nào đã được xử lý để tải về.');
    }
  };

  // Reset lại công cụ
  const handleReset = () => {
    setProcessedFiles([]);
    setIsProcessing(false);
    setProgress(0);
    setStatusText('');
    setMessage(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    showMessage('success', 'Đã làm mới công cụ.');
  };

  const hasDownloadableFiles = processedFiles.some(f => f.processedBlob !== null);
  
  // Class dùng chung cho các khối "glass"
  const glassCardClass = "border border-zinc-300/40 bg-white/40 backdrop-blur-xl rounded-2xl shadow-lg dark:bg-zinc-800/40 dark:border-zinc-700/40";

  return (
    <div className="w-full h-full p-4 text-zinc-800 dark:text-zinc-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* CỘT BÊN TRÁI: THÔNG TIN VÀ UPLOAD */}
            <div className="flex flex-col gap-6 min-h-0">                              
                {/* Khu vực Upload */}
                <div 
                    className={`${glassCardClass} flex-grow flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-transparent transition-all duration-300 ${libsLoaded ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                    onClick={() => libsLoaded && fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                >
                    <div className="text-5xl mb-4">📁</div>
                    <p className="font-semibold">Kéo thả file Excel vào đây</p>
                    <p className="text-xs opacity-70 mb-4">Hỗ trợ .xlsx, .xls - Có thể chọn nhiều file</p>
                    <button type="button" disabled={!libsLoaded || !!libsError} className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-semibold shadow-md hover:bg-cyan-700 transition disabled:bg-zinc-400 disabled:cursor-wait">
                        {libsError ? 'Lỗi tải thư viện' : (libsLoaded ? 'Hoặc chọn từ máy tính' : '⏳ Đang tải thư viện...')}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        multiple
                        accept=".xlsx,.xls"
                        onChange={(e) => handleProcessFiles(e.target.files)}
                        disabled={!libsLoaded}
                    />
                </div>

                {/* Các thẻ thông tin */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className={`${glassCardClass} p-1 flex items-center`}><InfoCardIcon>🛡️</InfoCardIcon> <span className="text-sm">An toàn, không ảnh hưởng dữ liệu.</span></div>
                    <div className={`${glassCardClass} p-1 flex items-center`}><InfoCardIcon>🔗</InfoCardIcon> <span className="text-sm">Xử lý Named Ranges lỗi.</span></div>
                    <div className={`${glassCardClass} p-1 flex items-center`}><InfoCardIcon>✅</InfoCardIcon> <span className="text-sm">Bảo toàn 100% công thức.</span></div>
                    <div className={`${glassCardClass} p-1 flex items-center`}><InfoCardIcon>📊</InfoCardIcon> <span className="text-sm">Báo cáo dung lượng chi tiết.</span></div>
                </div>               
            </div>

            {/* CỘT BÊN PHẢI: KẾT QUẢ */}
            <div className={`${glassCardClass} flex flex-col min-h-0 p-6`}>
                <h2 className="text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400">Kết Quả Xử Lý</h2>
                
                {message && (
                    <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                        {message.text}
                    </div>
                )}
                
                {isProcessing && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-full bg-zinc-200 rounded-full h-2.5 dark:bg-zinc-700 mb-2">
                            <div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-sm opacity-80">{statusText}</p>
                    </div>
                )}

                {!isProcessing && processedFiles.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
                        <div className="text-4xl mb-2">✨</div>
                        <p>Kết quả sẽ được hiển thị ở đây sau khi bạn tải file lên.</p>
                    </div>
                )}

                {!isProcessing && processedFiles.length > 0 && (
                    <div className="flex flex-col flex-grow min-h-0">
                        <div className="overflow-y-auto flex-grow pr-2">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-zinc-700 uppercase bg-zinc-50/50 dark:bg-zinc-700/50 dark:text-zinc-400 sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Tên file</th>
                                        <th scope="col" className="px-4 py-3">Gốc</th>
                                        <th scope="col" className="px-4 py-3">Sau XL</th>
                                        <th scope="col" className="px-4 py-3">Giảm</th>
                                        <th scope="col" className="px-4 py-3">Tải</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processedFiles.map((file, index) => (
                                        <tr key={index} className="border-b dark:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-700/30">
                                            <td className="px-4 py-2 font-medium truncate max-w-xs" title={file.fileName}>{file.fileName}</td>
                                            <td className="px-4 py-2">{formatFileSize(file.originalSize)}</td>
                                            <td className="px-4 py-2">{formatFileSize(file.processedSize)}</td>
                                            <td className={`px-4 py-2 font-semibold ${file.reduction > 5 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                                                {file.reduction >= 1 ? `${file.reduction.toFixed(1)}%` : '-'}
                                            </td>
                                            <td className="px-4 py-2">
                                                <button 
                                                    onClick={() => handleDownload(file)} 
                                                    disabled={!file.processedBlob}
                                                    className="px-2 py-1 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
                                                >
                                                    Tải
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-center gap-4 pt-4 mt-auto border-t border-zinc-200 dark:border-zinc-700">
                             <button onClick={handleDownloadAll} disabled={!hasDownloadableFiles} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold shadow-md hover:bg-emerald-700 transition disabled:bg-zinc-400 disabled:opacity-70 disabled:cursor-not-allowed">
                                📦 Tải tất cả (.zip)
                            </button>
                            <button onClick={handleReset} className="px-6 py-2 bg-zinc-500 text-white rounded-lg font-semibold shadow-md hover:bg-zinc-600 transition">
                                🔄 Làm mới
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}

