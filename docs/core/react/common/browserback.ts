import { useEffect, useState } from 'react';

const BrowserBackHandler = ({ onBack }) => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Push a new state to create a history entry
    if (!isInitialized) {
      window.history.pushState({ page: 'current' }, '');
      setIsInitialized(true);
    }

    // Handler for popstate event (triggered on browser back/forward)
    const handlePopState = (event) => {
      // If going back
      if (event.state === null) {
        // Prevent default back behavior
        window.history.pushState({ page: 'current' }, '');
        
        // Call the provided callback
        if (onBack) {
          onBack();
        }
      }
    };

    // Add event listener
    window.addEventListener('popstate', handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onBack, isInitialized]);

  return null; // This is a utility component, so it doesn't render anything
};

// Example usage component
const ExampleApp = () => {
  const [showModal, setShowModal] = useState(false);
  
  const handleOpen = () => {
    setShowModal(true);
  };
  
  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <div className="p-4">
      {showModal && (
        <>
          <BrowserBackHandler onBack={handleClose} />
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold mb-4">Modal Content</h2>
              <p className="mb-4">Try pressing the browser back button!</p>
              <button 
                onClick={handleClose}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Close Modal
              </button>
            </div>
          </div>
        </>
      )}
      
      {!showModal && (
        <button 
          onClick={handleOpen}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Open Modal
        </button>
      )}
    </div>
  );
};

export default ExampleApp;
