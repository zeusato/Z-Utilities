"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useRef, useEffect } from "react";
// Component Icon cho các thẻ thông tin
const InfoCardIcon = ({ children }) => (_jsx("div", { className: "text-xl mr-3 text-cyan-500", children: children }));
// Component chính
export default function ExcelCleanerTool() {
    const [processedFiles, setProcessedFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("");
    const [message, setMessage] = useState(null);
    const fileInputRef = useRef(null);
    const [libsLoaded, setLibsLoaded] = useState(false);
    const [libsError, setLibsError] = useState(null);
    // Tự động tải thư viện từ CDN khi component được mount
    useEffect(() => {
        // Nếu thư viện đã tồn tại, không cần tải lại
        if (window.XLSX && window.JSZip) {
            setLibsLoaded(true);
            return;
        }
        const loadScript = (src) => {
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
            showMessage('error', "Lỗi tải tài nguyên, vui lòng thử lại.");
        });
    }, []);
    // Hàm hiển thị thông báo và tự động ẩn
    const showMessage = (type, text, duration = 5000) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), duration);
    };
    // Hàm định dạng kích thước file
    const formatFileSize = (bytes) => {
        if (bytes === 0)
            return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };
    /**
     * Dọn dẹp định dạng từ các ô trống trong worksheet.
     * Chỉ xóa các cell chỉ chứa định dạng mà không có giá trị hay công thức.
     */
    const cleanEmptyFormatting = (worksheet) => {
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
                if (key[0] === '!')
                    return;
                hasCells = true;
                const cell = XLSX.utils.decode_cell(key);
                newRange.s.r = Math.min(newRange.s.r, cell.r);
                newRange.s.c = Math.min(newRange.s.c, cell.c);
                newRange.e.r = Math.max(newRange.e.r, cell.r);
                newRange.e.c = Math.max(newRange.e.c, cell.c);
            });
            if (!hasCells) {
                worksheet['!ref'] = 'A1'; // Sheet rỗng
            }
            else {
                worksheet['!ref'] = XLSX.utils.encode_range(newRange);
            }
        }
        return { changed, cleanedCells };
    };
    /**
     * Xử lý từng file Excel.
     * @param file File Excel cần xử lý
     */
    const processExcelFile = async (file) => {
        const XLSX = window.XLSX;
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result);
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
                        workbook.Workbook.Names = workbook.Workbook.Names.filter((name) => name && name.Ref && !name.Ref.includes('#REF!'));
                        const removedCount = originalCount - workbook.Workbook.Names.length;
                        if (removedCount > 0) {
                            changesMade = true;
                            processingLog.push(`Xóa ${removedCount} named range lỗi`);
                        }
                    }
                    let processedBlob = null;
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
                    }
                    else if (!changesMade) {
                        processedBlob = null; // Không có thay đổi, không cần tạo file mới
                        processedSize = file.size;
                    }
                    resolve({
                        originalFile: file, fileName: file.name, originalSize: file.size,
                        processedSize, reduction: Math.max(0, reduction), status, processedBlob, hasError: false,
                    });
                }
                catch (error) {
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
    const handleProcessFiles = useCallback(async (files) => {
        if (!files || files.length === 0)
            return;
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
        const results = [];
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
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('border-cyan-500', 'scale-105');
        handleProcessFiles(e.dataTransfer.files);
    }, [handleProcessFiles]);
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.add('border-cyan-500', 'scale-105');
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('border-cyan-500', 'scale-105');
    };
    // Tải file đơn lẻ
    const handleDownload = (result) => {
        if (!result.processedBlob)
            return;
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
        }
        else {
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
    return (_jsx("div", { className: "w-full h-full p-4 text-zinc-800 dark:text-zinc-200", children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 h-full", children: [_jsxs("div", { className: "flex flex-col gap-6 min-h-0", children: [_jsxs("div", { className: `${glassCardClass} flex-grow flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-transparent transition-all duration-300 ${libsLoaded ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`, onClick: () => libsLoaded && fileInputRef.current?.click(), onDrop: handleDrop, onDragOver: handleDragOver, onDragEnter: handleDragEnter, onDragLeave: handleDragLeave, children: [_jsx("div", { className: "text-5xl mb-4", children: "\uD83D\uDCC1" }), _jsx("p", { className: "font-semibold", children: "K\u00E9o th\u1EA3 file Excel v\u00E0o \u0111\u00E2y" }), _jsx("p", { className: "text-xs opacity-70 mb-4", children: "H\u1ED7 tr\u1EE3 .xlsx, .xls - C\u00F3 th\u1EC3 ch\u1ECDn nhi\u1EC1u file" }), _jsx("button", { type: "button", disabled: !libsLoaded || !!libsError, className: "px-6 py-2 bg-cyan-600 text-white rounded-lg font-semibold shadow-md hover:bg-cyan-700 transition disabled:bg-zinc-400 disabled:cursor-wait", children: libsError ? 'Lỗi tải thư viện' : (libsLoaded ? 'Hoặc chọn từ máy tính' : '⏳ Đang tải thư viện...') }), _jsx("input", { type: "file", ref: fileInputRef, className: "hidden", multiple: true, accept: ".xlsx,.xls", onChange: (e) => handleProcessFiles(e.target.files), disabled: !libsLoaded })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: [_jsxs("div", { className: `${glassCardClass} p-1 flex items-center`, children: [_jsx(InfoCardIcon, { children: "\uD83D\uDEE1\uFE0F" }), " ", _jsx("span", { className: "text-sm", children: "An to\u00E0n, kh\u00F4ng \u1EA3nh h\u01B0\u1EDFng d\u1EEF li\u1EC7u." })] }), _jsxs("div", { className: `${glassCardClass} p-1 flex items-center`, children: [_jsx(InfoCardIcon, { children: "\uD83D\uDD17" }), " ", _jsx("span", { className: "text-sm", children: "X\u1EED l\u00FD Named Ranges l\u1ED7i." })] }), _jsxs("div", { className: `${glassCardClass} p-1 flex items-center`, children: [_jsx(InfoCardIcon, { children: "\u2705" }), " ", _jsx("span", { className: "text-sm", children: "B\u1EA3o to\u00E0n 100% c\u00F4ng th\u1EE9c." })] }), _jsxs("div", { className: `${glassCardClass} p-1 flex items-center`, children: [_jsx(InfoCardIcon, { children: "\uD83D\uDCCA" }), " ", _jsx("span", { className: "text-sm", children: "B\u00E1o c\u00E1o dung l\u01B0\u1EE3ng chi ti\u1EBFt." })] })] })] }), _jsxs("div", { className: `${glassCardClass} flex flex-col min-h-0 p-6`, children: [_jsx("h2", { className: "text-xl font-bold mb-4 text-cyan-600 dark:text-cyan-400", children: "K\u1EBFt Qu\u1EA3 X\u1EED L\u00FD" }), message && (_jsx("div", { className: `mb-4 rounded-lg px-4 py-2 text-sm ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`, children: message.text })), isProcessing && (_jsxs("div", { className: "flex flex-col items-center justify-center h-full", children: [_jsx("div", { className: "w-full bg-zinc-200 rounded-full h-2.5 dark:bg-zinc-700 mb-2", children: _jsx("div", { className: "bg-cyan-600 h-2.5 rounded-full", style: { width: `${progress}%` } }) }), _jsx("p", { className: "text-sm opacity-80", children: statusText })] })), !isProcessing && processedFiles.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-center text-zinc-500", children: [_jsx("div", { className: "text-4xl mb-2", children: "\u2728" }), _jsx("p", { children: "K\u1EBFt qu\u1EA3 s\u1EBD \u0111\u01B0\u1EE3c hi\u1EC3n th\u1ECB \u1EDF \u0111\u00E2y sau khi b\u1EA1n t\u1EA3i file l\u00EAn." })] })), !isProcessing && processedFiles.length > 0 && (_jsxs("div", { className: "flex flex-col flex-grow min-h-0", children: [_jsx("div", { className: "overflow-y-auto flex-grow pr-2", children: _jsxs("table", { className: "w-full text-sm text-left", children: [_jsx("thead", { className: "text-xs text-zinc-700 uppercase bg-zinc-50/50 dark:bg-zinc-700/50 dark:text-zinc-400 sticky top-0", children: _jsxs("tr", { children: [_jsx("th", { scope: "col", className: "px-4 py-3", children: "T\u00EAn file" }), _jsx("th", { scope: "col", className: "px-4 py-3", children: "G\u1ED1c" }), _jsx("th", { scope: "col", className: "px-4 py-3", children: "Sau XL" }), _jsx("th", { scope: "col", className: "px-4 py-3", children: "Gi\u1EA3m" }), _jsx("th", { scope: "col", className: "px-4 py-3", children: "T\u1EA3i" })] }) }), _jsx("tbody", { children: processedFiles.map((file, index) => (_jsxs("tr", { className: "border-b dark:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-700/30", children: [_jsx("td", { className: "px-4 py-2 font-medium truncate max-w-xs", title: file.fileName, children: file.fileName }), _jsx("td", { className: "px-4 py-2", children: formatFileSize(file.originalSize) }), _jsx("td", { className: "px-4 py-2", children: formatFileSize(file.processedSize) }), _jsx("td", { className: `px-4 py-2 font-semibold ${file.reduction > 5 ? 'text-emerald-500' : 'text-zinc-500'}`, children: file.reduction >= 1 ? `${file.reduction.toFixed(1)}%` : '-' }), _jsx("td", { className: "px-4 py-2", children: _jsx("button", { onClick: () => handleDownload(file), disabled: !file.processedBlob, className: "px-2 py-1 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:bg-zinc-400 disabled:cursor-not-allowed", children: "T\u1EA3i" }) })] }, index))) })] }) }), _jsxs("div", { className: "flex items-center justify-center gap-4 pt-4 mt-auto border-t border-zinc-200 dark:border-zinc-700", children: [_jsx("button", { onClick: handleDownloadAll, disabled: !hasDownloadableFiles, className: "px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold shadow-md hover:bg-emerald-700 transition disabled:bg-zinc-400 disabled:opacity-70 disabled:cursor-not-allowed", children: "\uD83D\uDCE6 T\u1EA3i t\u1EA5t c\u1EA3 (.zip)" }), _jsx("button", { onClick: handleReset, className: "px-6 py-2 bg-zinc-500 text-white rounded-lg font-semibold shadow-md hover:bg-zinc-600 transition", children: "\uD83D\uDD04 L\u00E0m m\u1EDBi" })] })] }))] })] }) }));
}
