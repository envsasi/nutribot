import React, { useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import Modal from 'react-modal';

const videoConstraints = {
  width: 500,
  height: 500,
  facingMode: "environment"
};

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '10px',
  },
};

// Required for accessibility
Modal.setAppElement('#root');

export default function FoodScanner({ isOpen, onRequestClose, onCapture }) {
  const webcamRef = useRef(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    onCapture(imageSrc);
    onRequestClose(); // Close the modal after capturing
  }, [webcamRef, onCapture, onRequestClose]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={customStyles}
      contentLabel="Food Scanner Camera"
    >
      <div style={{ textAlign: 'center' }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={500}
          height={500}
          videoConstraints={videoConstraints}
        />
        <button onClick={capture} style={{ padding: '10px 20px', marginTop: '15px', fontSize: '16px' }}>
          Take Picture
        </button>
      </div>
    </Modal>
  );
}