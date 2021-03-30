import React, { useState, useEffect, useRef } from 'react'



export default function Dashboard() {

    let localStream;

    localVideoRef = useRef(null)

    useEffect(() => {
        const mediaConstraint = {
            video: true,
            audio: true
        }
        function gotLocalStream(stream) {
            localStream = stream;
            console.log(localVideoRef.current)
        }

    }, [])


    return (
        <video ref={localVideoRef} playsInline autoPlay></video>
    )


}