import React, { useRef, useCallback, useState } from 'react';
import Webcam from 'react-webcam';

const videoConstraints = {
  width: 350,
  height: 350,
  facingMode: "environment"
};

export default function FoodScanner({ onCapture, isProcessing }) {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);

  const capture = useCallback(() => {
    if (isProcessing) return;
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
    onCapture(imageSrc);
  }, [webcamRef, setImgSrc, onCapture, isProcessing]);

  const clearImage = () => {
    setImgSrc(null);
    onCapture(null);
  };

  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
      <h3 style={{ marginTop: 0 }}>Scan a Food Item</h3>
      <div style={{ borderRadius: '8px', overflow: 'hidden', width: '350px', height: '350px', background: '#ccc' }}>
        {imgSrc ? (
          <img src={imgSrc} alt="Captured food" />
        ) : (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={350}
            height={350}
            videoConstraints={videoConstraints}
          />
        )}
      </div>
      <div style={{ marginTop: '8px' }}>
        {imgSrc ? (
           <button onClick={clearImage} disabled={isProcessing} style={{ padding: '8px 12px' }}>
            Retake Picture
          </button>
        ) : (
          <button onClick={capture} disabled={isProcessing} style={{ padding: '8px 12px' }}>
            Capture Picture
          </button>
        )}
      </div>
    </div>
  );
}