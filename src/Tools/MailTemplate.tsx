"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";

// Declare Quill type to prevent TypeScript errors
declare global {
  interface Window {
    Quill: typeof Quill;
  }
}

// Component Icon for the info cards
const InfoCardIcon = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xl mr-3 text-cyan-500">{children}</div>
);

// Utility function to convert file to Base64
const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Utility function to escape HTML
const escapeHtml = (unsafe: string = "") => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Utility function to auto-link URLs, emails, and phone numbers
const autoLink = (html: string) => {
  if (!html) return "";
  // Link URLs
  html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1<\/a>');
  // Link emails
  html = html.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/g, '<a href="mailto:$1">$1<\/a>');
  // Link phone numbers (10 digits)
  html = html.replace(/(\b\d{10}\b)/g, '<a href="tel:$1">$1<\/a>');
  return html;
};

// Main component
export default function EmailBuilderTool() {
  // ⚠️ Quan trọng: dùng ref để giữ instance và tránh re-init
  const quillRef = useRef<Quill | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null); // parent wrapper để dọn toolbar cũ

  const [useHeader, setUseHeader] = useState(false);
  const [useFooter, setUseFooter] = useState(false);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [footerFile, setFooterFile] = useState<File | null>(null);
  const [headerDataUrl, setHeaderDataUrl] = useState("");
  const [footerDataUrl, setFooterDataUrl] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [htmlSize, setHtmlSize] = useState("0 KB");
  const [showHtml, setShowHtml] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load Quill editor on component mount (chống double toolbar do StrictMode/HMR)
  useEffect(() => {
    const container = editorRef.current;
    const wrap = editorWrapRef.current;
    if (!container || quillRef.current) return; // đã init thì thôi

    // Dọn mọi toolbar cũ nằm cạnh editor (Trường hợp HMR hoặc mount 2 lần)
    if (wrap) {
      wrap.querySelectorAll(':scope > .ql-toolbar').forEach((el) => el.remove());
    }

    // Clear container để đảm bảo sạch
    container.innerHTML = "";

    const editor = new Quill(container, {
      theme: "snow",
      modules: {
        toolbar: [
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "clean"],
        ],
      },
    });

    quillRef.current = editor;

    return () => {
      // Cleanup kỹ: gỡ toolbar và nội dung, rồi xoá instance
      try {
        if (wrap) wrap.querySelectorAll(':scope > .ql-toolbar').forEach((el) => el.remove());
        if (container) container.innerHTML = "";
      } finally {
        quillRef.current = null;
      }
    };
  }, []);

  // Handle file changes for header and footer images
  useEffect(() => {
    const processFiles = async () => {
      if (headerFile) {
        setHeaderDataUrl(await toBase64(headerFile));
      } else {
        setHeaderDataUrl("");
      }
      if (footerFile) {
        setFooterDataUrl(await toBase64(footerFile));
      } else {
        setFooterDataUrl("");
      }
    };
    processFiles();
  }, [headerFile, footerFile]);

  // Function to show a temporary message
  const showMessage = useCallback((type: "success" | "error", text: string, duration = 3000) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), duration);
  }, []);

  // Main function to build and preview the email
  const buildAndPreview = useCallback(() => {
    const q = quillRef.current;
    if (!q) return;

    const bodyHtml = autoLink(q.root.innerHTML);
    const generatedHtml = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Email</title>
<style>img{border:0;outline:none;text-decoration:none} table{border-collapse:collapse}</style>
</head>
<body style="margin:0; padding:0; background:#f3f4f6;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="1200" style="width:100%; max-width:1200px; background:#ffffff; border-radius:8px; overflow:hidden;">
        ${useHeader && headerDataUrl ? `<tr><td><img src="${headerDataUrl}" alt="header" width="1200" style="width:100%; height:auto; display:block; border:0"></td></tr>` : ""}
        <tr>
          <td style="padding:20px 24px; font-family:Arial,Helvetica,sans-serif; white-space: pre-wrap;">
            ${bodyHtml}
          </td>
        </tr>
        ${useFooter && footerDataUrl ? `<tr><td><img src="${footerDataUrl}" alt="footer" width="1200" style="width:100%; height:auto; display:block; border:0"></td></tr>` : ""}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

    setPreviewHtml(generatedHtml);
    setHtmlSize(`${(new Blob([generatedHtml]).size / 1024).toFixed(1)} KB`);
  }, [useHeader, useFooter, headerDataUrl, footerDataUrl]);

  // Handle download of the HTML file
  const downloadHtml = useCallback(() => {
    if (!previewHtml) {
      buildAndPreview();
    }
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "email-inline.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [previewHtml, buildAndPreview]);

  // Handle copying the HTML to clipboard
  const copyHtml = useCallback(async () => {
    if (!previewHtml) {
      buildAndPreview();
    }
    try {
      await navigator.clipboard.writeText(previewHtml);
      showMessage("success", "Đã copy HTML vào clipboard.");
    } catch (err) {
      showMessage("error", "Không thể tự động copy. Vui lòng chọn và copy thủ công.");
      console.error("Failed to copy HTML: ", err);
    }
  }, [previewHtml, buildAndPreview, showMessage]);

  const glassCardClass = "border border-zinc-300/40 bg-white/40 backdrop-blur-xl rounded-2xl shadow-lg dark:bg-zinc-800/40 dark:border-zinc-700/40";

  return (
    <div className="w-full h-full p-4 text-zinc-800 dark:text-zinc-200">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* LEFT COLUMN: CONTROLS */}
        <div className="flex flex-col gap-6 min-h-0">
          <div className={`${glassCardClass} flex-grow flex flex-col p-6`}>           

            {message && (
              <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${message.type === "success" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-rose-100 text-rose-800 border border-rose-300"}`}>
                {message.text}
              </div>
            )}

            <div className="flex flex-col gap-4 flex-grow">
              {/* <div className="h-px bg-zinc-300 dark:bg-zinc-700 my-2"></div> */}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useHeader"
                      checked={useHeader}
                      onChange={(e) => setUseHeader(e.target.checked)}
                      className="form-checkbox rounded text-cyan-600"
                    />
                    <label htmlFor="useHeader" className="text-sm font-semibold">Dùng Header (ảnh)</label>
                  </div>
                  {useHeader && (
                    <div className="flex flex-col gap-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setHeaderFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                      />
                      {/* <p className="text-xs text-zinc-500">Ảnh sẽ được nhúng base64, nên ưu tiên &lt; 200KB</p> */}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useFooter"
                      checked={useFooter}
                      onChange={(e) => setUseFooter(e.target.checked)}
                      className="form-checkbox rounded text-cyan-600"
                    />
                    <label htmlFor="useFooter" className="text-sm font-semibold">Dùng Footer (ảnh)</label>
                  </div>
                  {useFooter && (
                    <div className="flex flex-col gap-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFooterFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                      />
                      {/* <p className="text-xs text-zinc-500">Tuỳ chọn: logo/địa chỉ, bản quyền...</p> */}
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-zinc-300 dark:bg-zinc-700"></div>

              <div ref={editorWrapRef} className="flex flex-col gap-2 w-full flex-grow mt-0">
                <label className="text-sm font-semibold">Nội dung – soạn thảo như Word</label>
                {/* Quill sẽ tự tạo .ql-toolbar ngay phía trước container này. */}
                <div ref={editorRef} className="bg-white text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200" />
                <p className="text-xs text-zinc-500">
                  Mẹo: Dán từ Word/Docs rồi chỉnh lại; ảnh trong nội dung nên hạn chế hoặc dùng link/CDN.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW/OUTPUT */}
        <div className={`${glassCardClass} flex flex-col min-h-0 p-6`}>
          <div className="flex items-center justify-between mb-4">
            <span className="inline-block px-2 py-1 bg-zinc-100 dark:bg-zinc-700 rounded-full text-xs text-zinc-500">Template: 1200px · table layout · inline CSS</span>
            <button onClick={() => setShowHtml(!showHtml)} className="px-3 py-1 text-xs font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
              {showHtml ? "Hiện Preview" : "Hiện mã HTML"}
            </button>
          </div>
          <p className="text-sm text-zinc-500 mb-4">Kích thước HTML: {htmlSize}</p>
          <div className="flex flex-row gap-4 h-full">
            <div className="flex-1">
              {showHtml ? (
                <textarea
                  className="w-full h-full p-4 text-sm font-mono border rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 resize-none"
                  value={previewHtml}
                  readOnly
                />
              ) : (
                <iframe
                  title="Email Preview"
                  srcDoc={previewHtml}
                  className="w-full h-full border rounded-lg bg-white"
                  sandbox="allow-same-origin"
                />
              )}
            </div>
            <div className="flex flex-col gap-2 w-40">
              <button onClick={copyHtml} className="px-4 py-2 text-sm font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
                Copy HTML
              </button>
              <button onClick={buildAndPreview} className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition">
                Build & Preview
              </button>
              <button onClick={downloadHtml} className="px-4 py-2 text-sm font-semibold rounded-lg border bg-green-700/50 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-green-700 transition">
                Tải .html
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
