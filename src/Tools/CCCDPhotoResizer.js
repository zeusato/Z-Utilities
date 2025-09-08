"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
const glassClass = "border border-zinc-300/40 bg-white/40 backdrop-blur-xl rounded-2xl shadow-lg dark:bg-zinc-800/40 dark:border-zinc-700/40";
export default function CCCDPhotoResizer() {
    const [uploadedFile, setUploadedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [processedImageData, setProcessedImageData] = useState(null);
    const [showOptions, setShowOptions] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [photoType, setPhotoType] = useState("cccd");
    const [faceDetectionModel, setFaceDetectionModel] = useState(null);
    const [status, setStatus] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);
    const originalResultRef = useRef(null);
    const processedResultRef = useRef(null);
    // Initialize face detection model with CDN loading
    useEffect(() => {
        const initModel = async () => {
            try {
                setStatus({ message: "Đang tải thư viện TensorFlow.js...", type: "warning" });
                // Load TensorFlow.js from CDN
                // @ts-ignore
                if (!window.tf) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js';
                        script.onload = () => resolve();
                        script.onerror = () => reject(new Error('Failed to load TensorFlow.js'));
                        document.head.appendChild(script);
                    });
                }
                // Load BlazeFace from CDN
                // @ts-ignore
                if (!window.blazeface) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js';
                        script.onload = () => resolve();
                        script.onerror = () => reject(new Error('Failed to load BlazeFace'));
                        document.head.appendChild(script);
                    });
                }
                // Wait a bit for scripts to be fully loaded
                await new Promise(resolve => setTimeout(resolve, 500));
                // Now load the model using global window objects
                setStatus({ message: "Đang tải mô hình nhận diện khuôn mặt...", type: "warning" });
                // @ts-ignore
                if (window.blazeface) {
                    // @ts-ignore
                    const model = await window.blazeface.load();
                    setFaceDetectionModel(model);
                    setStatus({ message: "Đã tải xong mô hình nhận diện khuôn mặt", type: "success" });
                }
                else {
                    throw new Error('BlazeFace not available after loading');
                }
            }
            catch (error) {
                console.error("Error loading face detection model:", error);
                setStatus({ message: "Không thể tải mô hình nhận diện khuôn mặt. Sẽ sử dụng chế độ xử lý thông thường.", type: "warning" });
                setFaceDetectionModel(null);
            }
        };
        initModel();
    }, []);
    // Handle file upload
    const handleFileUpload = (file) => {
        // Validate file type
        if (!file.type.startsWith('image/') || !['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
            setStatus({ message: 'Định dạng file không được hỗ trợ. Vui lòng chọn file JPG, JPEG hoặc PNG.', type: "error" });
            return;
        }
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setStatus({ message: 'File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.', type: "error" });
            return;
        }
        setUploadedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result);
            setShowOptions(true);
            setStatus({ message: 'Đã nhận ảnh - sẵn sàng xử lý!', type: "success" });
        };
        reader.readAsDataURL(file);
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    };
    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('dragover');
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };
    // Process image
    const processImage = async () => {
        if (!uploadedFile) {
            setStatus({ message: 'Vui lòng chọn ảnh trước khi xử lý.', type: "error" });
            return;
        }
        setIsProcessing(true);
        setStatus({ message: 'Đang phân tích ảnh...', type: "warning" });
        try {
            const img = new Image();
            img.onload = async () => {
                try {
                    // Detect face
                    let faceDetected = false;
                    let faceBox = null;
                    if (faceDetectionModel) {
                        const predictions = await faceDetectionModel.estimateFaces(img, false);
                        if (predictions.length > 0) {
                            faceDetected = true;
                            faceBox = predictions[0].boundingBox;
                            setStatus({ message: 'Đã phát hiện khuôn mặt - đang căn chỉnh...', type: "success" });
                        }
                    }
                    if (!faceDetected) {
                        setStatus({ message: 'Không phát hiện được khuôn mặt rõ ràng. Sẽ xử lý ảnh theo cách thông thường.', type: "warning" });
                    }
                    // Get processing options
                    const dimensions = getPhotoDimensions(photoType);
                    // Process the image
                    const processedCanvas = await processImageWithOptions(img, {
                        faceBox,
                        photoType: dimensions
                    });
                    // Show results
                    const processedDataUrl = processedCanvas.toDataURL('image/jpeg', 1.0);
                    setProcessedImageData(processedDataUrl);
                    if (originalResultRef.current) {
                        originalResultRef.current.src = previewUrl;
                    }
                    if (processedResultRef.current) {
                        processedResultRef.current.src = processedDataUrl;
                    }
                    setShowResults(true);
                    setStatus({ message: 'Xử lý ảnh hoàn tất! Bạn có thể tải ảnh về bên dưới.', type: "success" });
                    // Scroll to results
                    const resultSection = document.getElementById('result-section');
                    resultSection?.scrollIntoView({ behavior: 'smooth' });
                }
                catch (error) {
                    console.error('Error processing image:', error);
                    setStatus({ message: 'Có lỗi xảy ra khi xử lý ảnh: ' + error.message, type: "error" });
                }
                finally {
                    setIsProcessing(false);
                }
            };
            img.onerror = () => {
                setStatus({ message: 'Không thể tải ảnh. Vui lòng thử lại.', type: "error" });
                setIsProcessing(false);
            };
            img.src = previewUrl;
        }
        catch (error) {
            console.error('Error in processImage:', error);
            setStatus({ message: 'Có lỗi xảy ra: ' + error.message, type: "error" });
            setIsProcessing(false);
        }
    };
    const downloadImage = () => {
        if (!processedImageData) {
            setStatus({ message: 'Không có ảnh để tải. Vui lòng xử lý ảnh trước.', type: "error" });
            return;
        }
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const typeMap = { cccd: 'cccd', passport: 'passport' };
        const filename = `${typeMap[photoType]}_photo_${timestamp}.jpg`;
        const link = document.createElement('a');
        link.href = processedImageData;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setStatus({ message: `Đã tải ảnh về với tên: ${filename}`, type: "success" });
    };
    const getPhotoDimensions = (type) => {
        switch (type) {
            case 'cccd':
                return {
                    width: 354,
                    height: 472,
                    faceHeightRatio: 0.625,
                    topMargin: 30,
                    bottomMargin: 45
                };
            case 'passport':
                return {
                    width: 472,
                    height: 709,
                    faceHeightRatio: 0.675,
                    topMargin: 40,
                    bottomMargin: 70
                };
            default:
                return {
                    width: 354,
                    height: 472,
                    faceHeightRatio: 0.625,
                    topMargin: 30,
                    bottomMargin: 45
                };
        }
    };
    const processImageWithOptions = async (img, options) => {
        const { faceBox, photoType } = options;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = photoType.width;
        canvas.height = photoType.height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        let cropArea;
        if (faceBox) {
            cropArea = calculateCropAreaWithFace(img, faceBox, photoType);
        }
        else {
            cropArea = calculateCenterCrop(img, photoType);
        }
        const scaleRatio = Math.min(photoType.width / cropArea.sw, photoType.height / cropArea.sh);
        if (scaleRatio < 0.5) {
            // Multi-step scaling for better quality
            const intermediateCanvas = document.createElement('canvas');
            const intermediateCtx = intermediateCanvas.getContext('2d');
            const intermediateWidth = photoType.width * 2;
            const intermediateHeight = photoType.height * 2;
            intermediateCanvas.width = intermediateWidth;
            intermediateCanvas.height = intermediateHeight;
            intermediateCtx.imageSmoothingEnabled = true;
            intermediateCtx.imageSmoothingQuality = 'high';
            intermediateCtx.drawImage(img, cropArea.sx, cropArea.sy, cropArea.sw, cropArea.sh, 0, 0, intermediateWidth, intermediateHeight);
            ctx.drawImage(intermediateCanvas, 0, 0, intermediateWidth, intermediateHeight, 0, 0, photoType.width, photoType.height);
        }
        else {
            ctx.drawImage(img, cropArea.sx, cropArea.sy, cropArea.sw, cropArea.sh, 0, 0, canvas.width, canvas.height);
        }
        return canvas;
    };
    const calculateCropAreaWithFace = (img, faceBox, targetDimensions) => {
        const [faceX, faceY, faceWidth, faceHeight] = faceBox;
        const faceCenterX = faceX + faceWidth / 2;
        const faceCenterY = faceY + faceHeight / 2;
        const targetFaceHeight = targetDimensions.height * targetDimensions.faceHeightRatio;
        const scaleFactor = targetFaceHeight / faceHeight;
        const cropWidth = targetDimensions.width / scaleFactor;
        const cropHeight = targetDimensions.height / scaleFactor;
        const cropX = faceCenterX - cropWidth / 2;
        const targetFaceTopInCrop = targetDimensions.topMargin / scaleFactor;
        const faceTopY = faceY;
        const cropY = faceTopY - targetFaceTopInCrop;
        const finalCropX = Math.max(0, Math.min(cropX, img.width - cropWidth));
        const finalCropY = Math.max(0, Math.min(cropY, img.height - cropHeight));
        const finalCropWidth = Math.min(cropWidth, img.width - finalCropX);
        const finalCropHeight = Math.min(cropHeight, img.height - finalCropY);
        return {
            sx: finalCropX,
            sy: finalCropY,
            sw: finalCropWidth,
            sh: finalCropHeight,
            scaleFactor: scaleFactor
        };
    };
    const calculateCenterCrop = (img, targetDimensions) => {
        const targetRatio = targetDimensions.width / targetDimensions.height;
        const imgRatio = img.width / img.height;
        let cropWidth, cropHeight;
        if (imgRatio > targetRatio) {
            cropHeight = img.height;
            cropWidth = cropHeight * targetRatio;
        }
        else {
            cropWidth = img.width;
            cropHeight = cropWidth / targetRatio;
        }
        const cropX = (img.width - cropWidth) / 2;
        const cropY = (img.height - cropHeight) / 2;
        return {
            sx: cropX,
            sy: cropY,
            sw: cropWidth,
            sh: cropHeight,
            scaleFactor: Math.min(targetDimensions.width / cropWidth, targetDimensions.height / cropHeight)
        };
    };
    const clearStatus = () => {
        setStatus(null);
    };
    return (_jsx("div", { className: "w-full h-full p-4 text-zinc-800 dark:text-zinc-200 overflow-hidden", children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100%-2rem)]", children: [_jsxs("div", { className: `${glassClass} col-span-1 flex flex-col p-2 gap-2`, children: [_jsxs("div", { className: "flex-grow flex flex-col justify-between gap-2", children: [_jsxs("div", { className: "border-2 border-dashed border-green-500 rounded-lg p-3 text-center bg-green-50/50 transition-all duration-300 cursor-pointer hover:border-green-600 hover:bg-green-50/70 dark:bg-green-900/20 mb-1", onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, onClick: triggerFileInput, children: [_jsx("div", { className: "text-2xl mb-1", children: "\uD83D\uDCF7" }), _jsx("div", { className: "text-xs font-medium mb-1", children: "K\u00E9o th\u1EA3 ho\u1EB7c click" }), _jsx("div", { className: "text-xs text-zinc-500 mb-2", children: "JPG, PNG (\u22645MB)" }), _jsx("button", { className: "bg-green-500 text-white px-3 py-1.5 rounded-md font-medium text-xs hover:bg-green-600 transition-colors w-full", children: "Ch\u1ECDn \u1EA3nh" }), _jsx("input", { ref: fileInputRef, type: "file", className: "hidden", accept: ".jpg,.jpeg,.png", onChange: (e) => e.target.files && handleFileUpload(e.target.files[0]) })] }), status && (_jsxs("div", { className: `p-1.5 rounded-md text-xs ${status.type === "success" ? "bg-green-100 text-green-800 border border-green-300" :
                                        status.type === "error" ? "bg-red-100 text-red-800 border border-red-300" :
                                            "bg-yellow-100 text-yellow-800 border border-yellow-300"}`, children: [status.message, _jsx("button", { onClick: clearStatus, className: "float-right text-xs", children: "\u00D7" })] }))] }), showOptions && (_jsxs("div", { className: "bg-white/20 rounded-lg p-2", children: [_jsx("h3", { className: "text-xs font-semibold text-center mb-1", children: "\uD83D\uDCD0 K\u00EDch th\u01B0\u1EDBc" }), _jsxs("div", { className: "space-y-1", children: [_jsxs("label", { className: "flex items-center gap-1.5 text-xs", children: [_jsx("input", { type: "radio", name: "photo-type", value: "cccd", checked: photoType === "cccd", onChange: (e) => setPhotoType(e.target.value), className: "w-3 h-3 text-green-600" }), _jsx("span", { children: "\uD83D\uDCC4 CCCD" })] }), _jsxs("label", { className: "flex items-center gap-1.5 text-xs", children: [_jsx("input", { type: "radio", name: "photo-type", value: "passport", checked: photoType === "passport", onChange: (e) => setPhotoType(e.target.value), className: "w-3 h-3 text-green-600" }), _jsx("span", { children: "\uD83D\uDEC2 H\u1ED9 chi\u1EBFu" })] })] })] }))] }), _jsxs("div", { className: `${glassClass} col-span-2 flex flex-col p-2 gap-2`, children: [_jsx("div", { className: "flex-1 flex items-center justify-center rounded-lg border-2 border-zinc-300 p-1", children: previewUrl ? (_jsx("img", { src: previewUrl, alt: "Preview", className: "max-w-full max-h-96 rounded-lg shadow-md" }, "preview")) : (_jsxs("div", { className: "text-center text-white", children: [_jsx("div", { className: "text-3xl mb-1", children: "\uD83D\uDDBC\uFE0F" }), _jsx("div", { className: "text-xs", children: "Preview s\u1EBD hi\u1EC3n th\u1ECB \u1EDF \u0111\u00E2y" })] })) }), showOptions && (_jsx("div", { className: "text-center", children: _jsx("button", { onClick: processImage, disabled: isProcessing || !uploadedFile, className: "bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm shadow-lg hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none w-full", children: isProcessing ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" }), "\u0110ang x\u1EED l\u00FD..."] })) : ("✂️ Cắt và chỉnh kích thước") }) }))] }), _jsxs("div", { className: `${glassClass} col-span-2 flex flex-col p-2 gap-2`, children: [_jsx("div", { className: "flex justify-center", children: _jsx("span", { className: "text-xs px-1.5 py-0.5 rounded-full text-white", children: "K\u1EBFt qu\u1EA3" }) }), _jsx("div", { className: "flex-1 flex items-center justify-center rounded-lg border-2 border-zinc-300 p-1", children: showResults ? (_jsxs("div", { className: "text-center w-full", children: [_jsx("img", { ref: processedResultRef, alt: "\u1EA2nh \u0111\u00E3 x\u1EED l\u00FD", className: "max-w-full max-h-80 rounded-lg shadow-md mx-auto mb-1" }, "result"), _jsxs("div", { className: "text-xs text-white", children: ["\u1EA2nh \u0111\u00E3 x\u1EED l\u00FD (", photoType.toUpperCase(), ")"] })] })) : (_jsxs("div", { className: "text-center text-white", children: [_jsx("div", { className: "text-3xl mb-1", children: "\u2728" }), _jsx("div", { className: "text-xs", children: "K\u1EBFt qu\u1EA3 s\u1EBD hi\u1EC3n th\u1ECB \u1EDF \u0111\u00E2y" })] })) }), showResults && (_jsx("div", { className: "text-center", children: _jsx("button", { onClick: downloadImage, className: "bg-green-500 text-white px-4 py-2.5 rounded-lg font-semibold text-sm shadow-lg hover:bg-green-600 transform hover:scale-105 transition-all duration-200 w-full", children: "\uD83D\uDCE5 T\u1EA3i \u1EA3nh v\u1EC1" }) }))] })] }) }));
}
