"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Glass card style
const fieldBox =
  "rounded-2xl border border-zinc-200/80 bg-white/70 shadow-sm backdrop-blur dark:bg-zinc-900/60 dark:border-zinc-700";

// Pick the best mime type supported by MediaRecorder
function pickSupportedMime(types: string[]): string | undefined {
  for (const t of types) {
    // @ts-ignore
    if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

export default function VideoExtractTool() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [meta, setMeta] = useState<{ width: number; height: number; duration: number } | null>(null);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("Đang khởi tạo…");
  const [message, setMessage] = useState<string>("Vui lòng chọn file video để bắt đầu.");

  // Results
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [audioMime, setAudioMime] = useState<string>("");
  const [videoMutedUrl, setVideoMutedUrl] = useState<string>("");
  const [videoMime, setVideoMime] = useState<string>("");

  const handlePick = () => inputRef.current?.click();

  const resetResults = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (videoMutedUrl) URL.revokeObjectURL(videoMutedUrl);
    setAudioUrl("");
    setVideoMutedUrl("");
  };

  useEffect(() => () => resetResults(), []);
    useEffect(() => {
    return () => {
        if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
        }
    };
    }, [fileUrl]);

    const resetAll = React.useCallback(() => {
    // Thu hồi các URL tạm
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (videoMutedUrl) URL.revokeObjectURL(videoMutedUrl);

    // Dừng và xóa src video preview
    if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
    }

    // Xóa input file
    if (inputRef.current) inputRef.current.value = "";

    // Reset state
    setFile(null);
    setFileUrl("");
    setMeta(null);

    setBusy(false);
    setProgress(0);
    setProgressText("Đang khởi tạo…");
    setMessage("Vui lòng chọn file video để bắt đầu.");

    setAudioUrl("");
    setAudioMime("");
    setVideoMutedUrl("");
    setVideoMime("");
    }, [fileUrl, audioUrl, videoMutedUrl]);
  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const f = files[0];
    if (!f.type.startsWith("video/")) {
      setMessage("File không phải video.");
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setMessage("File quá lớn! Vui lòng chọn file nhỏ hơn 100MB.");
      return;
    }
    resetResults();
    setFile(f);
    const url = URL.createObjectURL(f);
    setFileUrl(url);
    setMessage(`Đã chọn: ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`);
  };

  // Load metadata when url changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !fileUrl) return;
    v.src = fileUrl;
    v.onloadedmetadata = () => {
      setMeta({ width: v.videoWidth, height: v.videoHeight, duration: v.duration });
    };
  }, [fileUrl]);

  const startProgress = (text = "Đang khởi tạo…") => {
    setBusy(true);
    setProgress(0);
    setProgressText(text);
  };
  const updateProgress = (p: number, text?: string) => {
    setProgress(Math.max(0, Math.min(100, p)));
    if (text) setProgressText(text);
  };
  const finishProgress = (text = "Hoàn tất!") => {
    setProgress(100);
    setProgressText(text);
    setTimeout(() => setBusy(false), 300);
  };

  // ---- Extract AUDIO using WebAudio + MediaRecorder
  const extractAudio = useCallback(async () => {
    if (!file) return;
    try {
      startProgress("Đang tách audio…");

      const vEl = document.createElement("video");
      vEl.src = URL.createObjectURL(file);
      vEl.crossOrigin = "anonymous";
      updateProgress(10, "Đang tải video…");

      await new Promise<void>((resolve, reject) => {
        vEl.onloadedmetadata = () => resolve();
        vEl.onerror = () => reject(new Error("Không tải được metadata video"));
        setTimeout(() => reject(new Error("Timeout tải video")), 15000);
      });

      updateProgress(25, "Đang khởi tạo AudioContext…");
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      if (ctx.state === "suspended") await ctx.resume();

      const src = ctx.createMediaElementSource(vEl);
      const dest = ctx.createMediaStreamDestination();
      src.connect(dest);

      const audioType =
        pickSupportedMime([
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/ogg",
          "audio/mp4",
        ]) || "";

      const rec = new MediaRecorder(dest.stream, audioType ? { mimeType: audioType } : undefined);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data && chunks.push(e.data);
      rec.onerror = (e: any) => {
        console.error(e);
      };
      rec.onstop = () => {
        updateProgress(95, "Đang tạo file audio…");
        const blob = new Blob(chunks, { type: audioType || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioMime(audioType || "application/octet-stream");
        finishProgress();
        setMessage("Tách audio hoàn tất!");
      };

      updateProgress(35, "Bắt đầu ghi âm…");
      rec.start(800);

      vEl.ontimeupdate = () => {
        if (vEl.duration > 0) {
          const p = 35 + (vEl.currentTime / vEl.duration) * 55;
          updateProgress(p, `Đang xử lý… ${Math.round(vEl.currentTime)}s/${Math.round(vEl.duration)}s`);
        }
      };

      updateProgress(40, "Đang phát video để ghi âm…");
      await vEl.play();
      vEl.onended = () => {
        updateProgress(90, "Kết thúc ghi âm…");
        rec.stop();
        ctx.close();
      };
    } catch (err: any) {
      console.error(err);
      setBusy(false);
      setMessage("Lỗi khi tách audio: " + (err?.message || "Không xác định"));
    }
  }, [file]);

  // ---- Create MUTED VIDEO using Canvas + MediaRecorder
  const extractVideoMuted = useCallback(async () => {
    if (!file) return;
    try {
      startProgress("Đang tạo video không tiếng…");

      const vEl = document.createElement("video");
      vEl.src = URL.createObjectURL(file);
      vEl.muted = true;
      vEl.crossOrigin = "anonymous";

      updateProgress(10, "Đang tải video…");
      await new Promise<void>((resolve, reject) => {
        vEl.onloadedmetadata = () => resolve();
        vEl.onerror = () => reject(new Error("Không tải được metadata video"));
        setTimeout(() => reject(new Error("Timeout tải video")), 15000);
      });

      updateProgress(25, "Đang tạo canvas…");
      const canvas = document.createElement("canvas");
      canvas.width = vEl.videoWidth;
      canvas.height = vEl.videoHeight;
      const ctx = canvas.getContext("2d")!;

      const videoType =
        pickSupportedMime([
          "video/webm;codecs=vp9",
          "video/webm;codecs=vp8",
          "video/webm",
          "video/mp4;codecs=h264",
          "video/mp4",
        ]) || "";

      const stream = canvas.captureStream(30); // 30 FPS
      const rec = new MediaRecorder(stream, videoType ? { mimeType: videoType, videoBitsPerSecond: 2_500_000 } : undefined);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data && chunks.push(e.data);
      rec.onstop = () => {
        updateProgress(95, "Đang tạo file video…");
        const blob = new Blob(chunks, { type: videoType || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        setVideoMutedUrl(url);
        setVideoMime(videoType || "application/octet-stream");
        finishProgress();
        setMessage("Tạo video không tiếng hoàn tất!");
      };

      updateProgress(40, "Bắt đầu ghi video…");
      rec.start(800);

      vEl.ontimeupdate = () => {
        if (vEl.duration > 0) {
          const p = 40 + (vEl.currentTime / vEl.duration) * 50;
          updateProgress(p, `Đang xử lý… ${Math.round(vEl.currentTime)}s/${Math.round(vEl.duration)}s`);
        }
      };

      const draw = () => {
        if (!vEl.paused && !vEl.ended) {
          ctx.drawImage(vEl, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(draw);
        }
      };
      vEl.onplay = draw;

      await vEl.play();
      vEl.onended = () => {
        updateProgress(90, "Kết thúc ghi video…");
        rec.stop();
      };
    } catch (err: any) {
      console.error(err);
      setBusy(false);
      setMessage("Lỗi khi tạo video không tiếng: " + (err?.message || "Không xác định"));
    }
  }, [file]);

  const audioDownloadName = useMemo(() => {
    const base = file?.name?.replace(/\.[^.]+$/, "") || "audio";
    if (audioMime.includes("webm")) return base + ".webm";
    if (audioMime.includes("ogg")) return base + ".ogg";
    if (audioMime.includes("mp4")) return base + ".m4a";
    return base + ".bin";
  }, [file?.name, audioMime]);

  const videoDownloadName = useMemo(() => {
    const base = file?.name?.replace(/\.[^.]+$/, "") || "video_muted";
    if (videoMime.includes("webm")) return base + ".webm";
    if (videoMime.includes("mp4")) return base + ".mp4";
    return base + ".bin";
  }, [file?.name, videoMime]);

  return (
    <div className="w-full h-full overflow-hidden">

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr] gap-4 h-[calc(100%-2rem)]">
        {/* LEFT controls */}
        <div className="min-w-0 overflow-auto lg:overflow-hidden flex flex-col gap-3">
          <div className={`${fieldBox} p-4`}>
            <div className="flex items-center gap-2">
              <button onClick={handlePick} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Chọn video
              </button>
              {file && <span className="text-xs opacity-70">{file.name}</span>}
              <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => onFiles(e.target.files)} />
            </div>
          </div>

          <div className={`${fieldBox} p-4`}>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!file || busy}
                onClick={extractAudio}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
              >
                Tách Audio
              </button>
              <button
                disabled={!file || busy}
                onClick={extractVideoMuted}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
              >
                Tách Video (không tiếng)
              </button>
            </div>

            {/* Progress */}
            {busy && (
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 text-xs opacity-75">{progressText}</div>
              </div>
            )}

            {/* Message */}
            <div className="mt-3 text-sm opacity-80">{message}</div>
          </div>
        {/* Results: audio */}
        {audioUrl && (
        <div className={`${fieldBox} p-4`}>
            <div className="font-medium mb-2">Preview Audio</div>
            <audio controls className="w-full" src={audioUrl} />
            <a href={audioUrl} download={audioDownloadName} className="mt-2 inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
            Tải {audioDownloadName}
            </a>
        </div>
        )}
          
        <button
            type="button"
            onClick={resetAll}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
            Reset
        </button>
        </div>
        
        {/* RIGHT preview */}
        {/* <div className={`${fieldBox} p-4 min-w-0 overflow-hidden`}> */}
            {/* Results: muted video */}
            {videoMutedUrl && (
            <div className={`${fieldBox} p-4`}>
                <div className="font-medium mb-2">Preview Video (không tiếng)</div>

                {/* Khung cố định, video luôn fit bên trong */}
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black/70">
                <video
                    controls
                    src={videoMutedUrl}
                    className="absolute inset-0 h-full w-full object-contain"
                />
                </div>

                <a
                href={videoMutedUrl}
                download={videoDownloadName}
                className="mt-2 inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                Tải {videoDownloadName}
                </a>
            </div>
            )}

          {/* <div className="font-medium mb-2">Preview video gốc</div>
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/60">
            <video ref={videoRef} controls className="h-full w-full" />
          </div>
          {meta && (
            <div className="mt-2 text-xs opacity-75">{meta.width}×{meta.height} · {Math.round(meta.duration)}s</div>
          )} */}

        </div>
      </div>
    // </div>
  );
}
