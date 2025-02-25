
// src/context/JourneyContext.js
import { createContext, useContext, useState } from 'react';

const JourneyContext = createContext();

export const JourneyProvider = ({ children }) => {
  // Track current page/step in user journey
  const [currentStep, setCurrentStep] = useState('channel-list');
  
  // Track operation type (read/write)
  const [operationType, setOperationType] = useState('read');
  
  // Track loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Store channel data
  const [channels, setChannels] = useState([
    { id: 1, name: 'General', description: 'General discussion' },
    { id: 2, name: 'Support', description: 'Customer support' }
  ]);
  
  // Store current channel being viewed/edited
  const [currentChannel, setCurrentChannel] = useState(null);

  // Navigation functions
  const navigateTo = (step, channelId = null) => {
    setError(null); // Clear any existing errors
    setCurrentStep(step);
    if (channelId) {
      const channel = channels.find(c => c.id === channelId);
      if (channel) {
        setCurrentChannel(channel);
      } else {
        setError('Channel not found');
      }
    } else {
      setCurrentChannel(null);
    }
  };

  // Operation functions
  const setOperation = (type) => {
    if (type !== 'read' && type !== 'write') {
      setError('Invalid operation type');
      return;
    }
    setOperationType(type);
    setError(null);
  };

  // Channel operations with error handling
  const addChannel = async (channel) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate channel data
      if (!channel.name || !channel.description) {
        throw new Error('Channel name and description are required');
      }

      const newChannel = {
        id: channels.length + 1,
        ...channel,
        createdAt: new Date().toISOString()
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setChannels(prevChannels => [...prevChannels, newChannel]);
      return newChannel;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateChannel = async (channelId, updates) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate updates
      if (!updates.name || !updates.description) {
        throw new Error('Channel name and description are required');
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setChannels(prevChannels =>
        prevChannels.map(channel =>
          channel.id === channelId
            ? { ...channel, ...updates, updatedAt: new Date().toISOString() }
            : channel
        )
      );
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    currentStep,
    operationType,
    channels,
    currentChannel,
    isLoading,
    error,
    navigateTo,
    setOperation,
    addChannel,
    updateChannel
  };

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
};

export const useJourney = () => {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error('useJourney must be used within a JourneyProvider');
  }
  return context;
};

// src/components/LoadingSpinner.js
const LoadingSpinner = () => (
  <div className="flex justify-center items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

// src/components/ErrorMessage.js
const ErrorMessage = ({ message }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
    <span className="block sm:inline">{message}</span>
  </div>
);

// src/components/ChannelList.js
const ChannelList = () => {
  const { channels, navigateTo, setOperation, isLoading, error } = useJourney();

  const handleChannelClick = (channelId) => {
    setOperation('read');
    navigateTo('channel-detail', channelId);
  };

  const handleCreateNew = () => {
    setOperation('write');
    navigateTo('channel-form');
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4">
      {error && <ErrorMessage message={error} />}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Channels</h1>
        <button
          onClick={handleCreateNew}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create New Channel
        </button>
      </div>
      <div className="space-y-4">
        {channels.map(channel => (
          <div
            key={channel.id}
            onClick={() => handleChannelClick(channel.id)}
            className="border p-4 rounded cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-xl font-semibold">{channel.name}</h2>
            <p className="text-gray-600">{channel.description}</p>
            <div className="text-sm text-gray-500 mt-2">
              Created: {new Date(channel.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// src/components/ChannelForm.js
const ChannelForm = () => {
  const { currentChannel, addChannel, updateChannel, navigateTo, isLoading, error } = useJourney();
  const [formData, setFormData] = useState(
    currentChannel || { name: '', description: '' }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentChannel) {
        await updateChannel(currentChannel.id, formData);
      } else {
        await addChannel(formData);
      }
      navigateTo('channel-list');
    } catch (err) {
      // Error is handled by context
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="p-4">
      {error && <ErrorMessage message={error} />}
      <h1 className="text-2xl
