import React, { useEffect, useRef, useState } from 'react'
import { firestore } from "../firebase/firebase"


export default function Dashboard() {

    let localStream;
    let remoteStream = new MediaStream();
    let [callID, setCallID] = useState("")
    let localVideoRef = useRef(null)
    let remoteVideoRef = useRef(null)

    const servers = {
        iceServers: [
            {
                urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
            },
        ],
        iceCandidatePoolSize: 10,
    };

    let [pc, setPC] = useState(new RTCPeerConnection(servers))

    useEffect(() => {
        const mediaConstraint = {
            video: true,
            audio: true
        }
        async function gotLocalStream(stream) {
            localStream = stream;
            console.log(stream, localVideoRef.current)
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream))
            localVideoRef.current.srcObject = localStream
        }
        navigator.mediaDevices.getUserMedia(mediaConstraint)
            .then(stream => {
                gotLocalStream(stream)
            })
            .catch(err => console.log(err))


        pc.ontrack = event => {
            console.log("new stream has been added", event.streams[0].getTracks())
            event.streams[0].getTracks().forEach(track => {
                remoteStream.addTrack(track);
            });
        };

        remoteVideoRef.current.srcObject = remoteStream;
        console.log("the things is", pc)

    }, [])

    async function handleCall() {
        const callDoc = firestore.collection('calls').doc();
        const offerCandidates = callDoc.collection('offerCandidates');
        const answerCandidates = callDoc.collection('answerCandidates');

        console.log("call-log id is ", callDoc.id)


        pc.onicecandidate = event => {
            event.candidate && offerCandidates.add(event.candidate.toJSON());
        }

        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
        };

        await callDoc.set({ offer });

        callDoc.onSnapshot((snapshot) => {
            const data = snapshot.data();
            if (!pc.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                pc.setRemoteDescription(answerDescription);
            }
        });


        answerCandidates.onSnapshot(snapshot => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.addIceCandidate(candidate);
                }
            });
        });

        answerCandidates.onSnapshot(snapshot => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.addIceCandidate(candidate);
                }
            });
        });

        console.log("pc after calling", pc)

    }

    async function handleAnswer() {

        const callId = callID;
        const callDoc = firestore.collection('calls').doc(callId);
        const offerCandidates = callDoc.collection('offerCandidates');
        const answerCandidates = callDoc.collection('answerCandidates');

        pc.onicecandidate = event => {
            event.candidate && answerCandidates.add(event.candidate.toJSON());
        };

        // Fetch data, then set the offer & answer

        const callData = (await callDoc.get()).data();


        const offerDescription = callData.offer;
        await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

        const answerDescription = await pc.createAnswer();
        await pc.setLocalDescription(answerDescription);

        const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
        };

        await callDoc.update({ answer });

        // Listen to offer candidates

        offerCandidates.onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                console.log(change)
                if (change.type === 'added') {
                    let data = change.doc.data();
                    pc.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });

        console.log("je", remoteStream)
        console.log("pc after answer:", pc)

    }

    return (
        <>
            <video ref={localVideoRef} playsInline autoPlay muted></video>
            <video ref={remoteVideoRef} playsInline autoPlay muted></video>



            <input type="text" value={callID} onChange={(e) => setCallID(e.target.value)} />


            <div>
                <button id="startButton">Start</button>
                <button id="callButton" onClick={handleCall}>Call</button>
                <button id="answerButton" onClick={handleAnswer}>Answer</button>
                <button id="hangupButton">Hang Up</button>
            </div>


        </>
    )


}