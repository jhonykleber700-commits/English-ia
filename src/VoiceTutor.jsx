import React, { useEffect, useRef, useState } from 'react';

export default function VoiceTutor() {
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const [status, setStatus] = useState('Pronto para conversar');
  const [error, setError] = useState('');

  const [userText, setUserText] = useState('');
  const [aiText, setAiText] = useState('');

  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioRef = useRef(null);
  const transcriptTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      stopVoice(false);
    };
  }, []);

  function clearTranscriptTimer() {
    if (transcriptTimerRef.current) {
      clearTimeout(transcriptTimerRef.current);
      transcriptTimerRef.current = null;
    }
  }

  function returnToListeningSoon() {
    clearTranscriptTimer();

    transcriptTimerRef.current = setTimeout(() => {
      if (connected) {
        setStatus('🎙️ Ouvindo...');
      }
    }, 1400);
  }

  async function startVoice() {
    if (connecting || connected) return;

    setOpen(true);
    setConnecting(true);
    setError('');
    setUserText('');
    setAiText('');
    setStatus('Conectando com a IA...');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Este navegador não oferece acesso ao microfone.'
        );
      }

      if (!window.RTCPeerConnection) {
        throw new Error(
          'Este navegador não oferece suporte à conversa em tempo real.'
        );
      }

      const pc = new RTCPeerConnection();

      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;

        if (state === 'connected') {
          setConnected(true);
          setConnecting(false);
          setStatus('🎙️ Ouvindo... pode falar.');
        }

        if (
          state === 'failed' ||
          state === 'disconnected'
        ) {
          setStatus('Conexão interrompida.');
        }

        if (state === 'closed') {
          setConnected(false);
        }
      };

      pc.ontrack = event => {
        const stream = event.streams?.[0];

        if (audioRef.current && stream) {
          audioRef.current.srcObject = stream;

          audioRef.current
            .play()
            .catch(() => {});
        }
      };

      const dc = pc.createDataChannel('oai-events');

      dataChannelRef.current = dc;

      dc.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setStatus('🎙️ Ouvindo... pode falar.');
      };

      dc.onclose = () => {
        setConnected(false);
      };

      dc.onerror = () => {
        setError('Erro no canal da conversa por voz.');
      };

      dc.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'session.started') {
            setConnected(true);
            setConnecting(false);
            setStatus('🎙️ Ouvindo... pode falar.');
          }

          if (
            data.type ===
            'session.input_transcript.delta'
          ) {
            setStatus('🎙️ Você está falando...');

            setUserText(old =>
              old + (data.delta || '')
            );
          }

          if (
            data.type ===
            'session.output_transcript.delta'
          ) {
            setStatus('🔊 English IA está falando...');

            setAiText(old =>
              old + (data.delta || '')
            );

            returnToListeningSoon();
          }

          if (data.type === 'session.closed') {
            setConnected(false);
            setStatus('Conversa encerrada.');
          }

        } catch {
          // Ignora eventos que não sejam JSON.
        }
      };

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

      streamRef.current = stream;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      const offer = await pc.createOffer();

      await pc.setLocalDescription(offer);

      const response = await fetch(
        '/api/voice-session',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            sdp: offer.sdp
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
          'Não foi possível criar a sessão de voz.'
        );
      }

      const answerSdp =
        data?.transport?.sdp;

      if (!answerSdp) {
        throw new Error(
          'A OpenAI não retornou o áudio da sessão.'
        );
      }

      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });

    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
        'Não foi possível iniciar a conversa.'
      );

      setStatus('Não conectado.');
      setConnecting(false);
      setConnected(false);

      stopVoice(false);
    }
  }

  function stopVoice(updateState = true) {
    clearTranscriptTimer();

    try {
      const dc = dataChannelRef.current;

      if (
        dc &&
        dc.readyState === 'open'
      ) {
        try {
          dc.send(
            JSON.stringify({
              type: 'session.close'
            })
          );
        } catch {}
      }

      dataChannelRef.current?.close();
    } catch {}

    try {
      pcRef.current?.close();
    } catch {}

    try {
      streamRef.current
        ?.getTracks()
        .forEach(track => track.stop());
    } catch {}

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    pcRef.current = null;
    streamRef.current = null;
    dataChannelRef.current = null;

    if (updateState) {
      setConnected(false);
      setConnecting(false);
      setStatus('Conversa encerrada.');
    }
  }

  function closeVoice() {
    stopVoice();
    setOpen(false);
  }

  return (
    <>
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />

      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={styles.floatingButton}
        >
          🎧 Voz IA
        </button>
      )}

      {open && (
        <div style={styles.overlay}>

          <div style={styles.modal}>

            <div style={styles.top}>

              <div>
                <small style={styles.small}>
                  ENGLISH IA LIVE
                </small>

                <h2 style={styles.title}>
                  Conversa por voz
                </h2>
              </div>

              <button
                onClick={closeVoice}
                style={styles.close}
              >
                ✕
              </button>

            </div>

            <div style={styles.status}>
              {status}
            </div>

            <div style={styles.voiceCircle}>
              <div
                style={{
                  ...styles.innerCircle,
                  ...(connected
                    ? styles.activeCircle
                    : {})
                }}
              >
                {connected
                  ? '🎙️'
                  : '🤖'}
              </div>
            </div>

            <p style={styles.help}>
              {connected
                ? 'Fale normalmente. A IA percebe quando você termina e responde por voz.'
                : 'Inicie a conversa e permita o acesso ao microfone.'}
            </p>

            {(userText || aiText) && (
              <div style={styles.transcripts}>

                {userText && (
                  <div style={styles.userTranscript}>
                    <b>Você</b>
                    <p style={styles.text}>
                      {userText}
                    </p>
                  </div>
                )}

                {aiText && (
                  <div style={styles.aiTranscript}>
                    <b style={styles.aiName}>
                      English IA
                    </b>

                    <p style={styles.text}>
                      {aiText}
                    </p>
                  </div>
                )}

              </div>
            )}

            {error && (
              <div style={styles.error}>
                ⚠️ {error}
              </div>
            )}

            {!connected && (
              <button
                onClick={startVoice}
                disabled={connecting}
                style={styles.startButton}
              >
                {connecting
                  ? 'Conectando...'
                  : '🎙️ Iniciar conversa por voz'}
              </button>
            )}

            {connected && (
              <button
                onClick={() => stopVoice()}
                style={styles.endButton}
              >
                ■ Encerrar conversa
              </button>
            )}

          </div>

        </div>
      )}
    </>
  );
}

const styles = {
  floatingButton: {
    position: 'fixed',
    right: '18px',
    bottom: '92px',
    zIndex: 30,

    width: 'auto',
    margin: 0,
    padding: '13px 17px',

    border: 0,
    borderRadius: '30px',

    background: '#35d3aa',
    color: '#05231d',

    fontWeight: 800,
    fontSize: '14px',

    boxShadow:
      '0 10px 30px rgba(0,0,0,.35)'
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    padding: '16px',

    background:
      'rgba(3, 10, 18, .92)',

    backdropFilter: 'blur(10px)'
  },

  modal: {
    width: '100%',
    maxWidth: '480px',
    maxHeight: '92vh',

    overflowY: 'auto',

    padding: '24px',

    background:
      'linear-gradient(180deg,#112943,#081523)',

    border:
      '1px solid #294661',

    borderRadius: '28px',

    boxShadow:
      '0 25px 80px rgba(0,0,0,.55)',

    color: '#eef5ff'
  },

  top: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '15px'
  },

  small: {
    color: '#66e3c4',
    fontWeight: 800,
    letterSpacing: '1.2px'
  },

  title: {
    margin: '7px 0 0',
    fontSize: '28px'
  },

  close: {
    width: '42px',
    height: '42px',

    margin: 0,
    padding: 0,

    border:
      '1px solid #38546d',

    borderRadius: '50%',

    background: '#13273c',
    color: '#fff',

    fontSize: '17px'
  },

  status: {
    marginTop: '24px',

    padding: '11px 14px',

    background: '#10243a',

    border:
      '1px solid #2f4c67',

    borderRadius: '14px',

    textAlign: 'center',

    color: '#bcd0e4',
    fontSize: '14px'
  },

  voiceCircle: {
    display: 'flex',
    justifyContent: 'center',

    margin:
      '35px 0 25px'
  },

  innerCircle: {
    display: 'grid',
    placeItems: 'center',

    width: '125px',
    height: '125px',

    borderRadius: '50%',

    background: '#17334d',

    border:
      '2px solid #365a77',

    fontSize: '45px',

    boxShadow:
      '0 0 0 14px rgba(50,100,140,.08)'
  },

  activeCircle: {
    background:
      'radial-gradient(circle,#35d3aa,#137e69)',

    border:
      '2px solid #76efd0',

    boxShadow:
      '0 0 0 14px rgba(53,211,170,.10), 0 0 55px rgba(53,211,170,.28)'
  },

  help: {
    margin:
      '0 auto 22px',

    maxWidth: '350px',

    color: '#9eb3c9',

    lineHeight: 1.55,

    textAlign: 'center'
  },

  transcripts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',

    maxHeight: '220px',

    overflowY: 'auto',

    marginBottom: '18px'
  },

  userTranscript: {
    alignSelf: 'flex-end',

    maxWidth: '88%',

        padding: '12px 14px',

    background: '#35d3aa',

    color: '#06271f',

    borderRadius:
      '16px 16px 4px 16px'
  },

  aiTranscript: {
    alignSelf: 'flex-start',

    maxWidth: '88%',

    padding: '12px 14px',

    background: '#142b43',

    border:
      '1px solid #31506d',

    borderRadius:
      '16px 16px 16px 4px'
  },

  aiName: {
    color: '#66e3c4'
  },

  text: {
    margin: '5px 0 0',
    lineHeight: 1.45
  },

  error: {
    marginBottom: '15px',

    padding: '12px',

    background:
      'rgba(190,60,70,.15)',

    border:
      '1px solid rgba(230,90,100,.4)',

    borderRadius: '12px',

    color: '#ffc1c7'
  },

  startButton: {
    width: '100%',

    marginTop: '8px',

    padding: '17px',

    border: 0,
    borderRadius: '15px',

    background: '#35d3aa',
    color: '#05231d',

    fontWeight: 800
  },

  endButton: {
    width: '100%',

    marginTop: '8px',

    padding: '17px',

    border:
      '1px solid #a54755',

    borderRadius: '15px',

    background: '#5e2832',
    color: '#fff',

    fontWeight: 800
  }
};
