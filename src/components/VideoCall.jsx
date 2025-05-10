import React, { useEffect, useRef, useState } from "react";
import socket from "../socket";

const VideoCall = ({ currentUser, selectedUser, onCallEnd }) => {
  // Removed all video-related refs and state
  const [callStatus, setCallStatus] = useState("idle");
  const [remoteUserName, setRemoteUserName] = useState("");
  const [connectionError, setConnectionError] = useState(null);
  const [callEndedMessage, setCallEndedMessage] = useState("");
  const isMounted = useRef(false);

  // Clean up function
  const endCall = () => {
    if (!isMounted.current) return;

    // Reset state
    setCallStatus("idle");
    setRemoteUserName("");
    setConnectionError(null);
    setCallEndedMessage("");
    
    // Close the call interface
    onCallEnd();
  };

  // Handle call rejection
  const handleCallRejected = () => {
    setConnectionError("Call rejected by recipient");
    endCall();
  };

  // Set up socket listeners
  useEffect(() => {
    isMounted.current = true;
    
    socket.on("callRejected", handleCallRejected);

    return () => {
      isMounted.current = false;
      socket.off("callRejected", handleCallRejected);
      endCall();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      {/* Call Ended Notification */}
      {callEndedMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
          <div className="bg-gray-800 text-white p-6 rounded-lg text-center">
            <p className="text-xl font-semibold">{callEndedMessage}</p>
          </div>
        </div>
      )}

      <div className="relative bg-gray-900 p-6 rounded-lg border border-gray-700 w-full max-w-4xl">
        {/* Call status header */}
        <div className="text-center mb-4">
          {connectionError && (
            <p className="text-red-500">{connectionError}</p>
          )}
        </div>

        {/* Call controls */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={endCall}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full flex items-center gap-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;