import React, { useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import Modal from 'react-modal';

// UPDATED: Reduced the camera size
const videoConstraints = {
  width: 400,
  height: 400,
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
    border: '1px solid #3c4043',
    borderRadius: '12px',
    background: '#1e1f20',
    textAlign: 'center'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)'
  }
};

Modal.setAppElement('#root');

export default function FoodScanner({ isOpen, onRequestClose, onCapture }) {
  const webcamRef = useRef(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    onCapture(imageSrc);
    onRequestClose();
  }, [webcamRef, onCapture, onRequestClose]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      style={customStyles}
      contentLabel="Food Scanner Camera"
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h3 style={{ color: '#e3e3e3', marginTop: 0, marginBottom: '15px' }}>Scan a Food Item</h3>

        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={400}
          height={400}
          videoConstraints={videoConstraints}
        />

        <button
          onClick={capture}
          style={{
            marginTop: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            border: '4px solid #a1a1aa',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Take Picture"
        />
      </div>
    </Modal>
  );
}