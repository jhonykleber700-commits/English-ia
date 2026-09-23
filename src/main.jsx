import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const lessons = [
  ['Cumprimentos', 'Good morning! How are you?', 'Bom dia! Como você está?'],
  ['Apresentação', "Hi, I'm Jhony. Nice to meet you.", 'Olá, eu sou Jhony. Prazer em conhecer você.'],
  ['Entrevista', 'I have experience operating farm machinery.', 'Tenho experiência operando máquinas agrícolas.'],
  ['Entrevista', 'I am willing to learn and work hard.', 'Estou disposto a aprender e trabalhar duro.'],
  ['Comunicação', 'Could you repeat that more slowly, please?', 'Pode repetir mais devagar, por favor?'],
  ['Trabalho', 'What time does the shift start?', 'Que horas começa o turno?']
];

function App() {
  const [tab, setTab] = useState('home');

  const [lesson, setLesson] = useState(() =>
    Number(localStorage.getItem('english_lesson') || 0)
  );

  const [xp, setXp] = useState(() =>
    Number(localStorage.getItem('english_xp') || 180)
  );

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi! 👋 I am your English IA teacher. Fale ou escreva em inglês e eu vou conversar com você, corrigir seus erros e ajudá-lo.'
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState('');

  const recognitionRef = useRef(null);

  const currentLesson = lessons[lesson];

  useEffect(() => {
    localStorage.setItem('english_xp', xp);
  }, [xp]);

  useEffect(() => {
    localStorage.setItem('english_lesson', lesson);
  }, [lesson]);

  function speak(text) {
    if (!window.speechSynthesis) {
      setNotice('Seu navegador não conseguiu reproduzir áudio.');
      return;
    }

    window.speechSynthesis.cancel();

    const voice = new SpeechSynthesisUtterance(text);
    voice.lang = 'en-US';
    voice.rate = 0.8;

    window.speechSynthesis.speak(voice);
  }

  function openPractice() {
    setMessages([
      {
        role: 'assistant',
        content:
          `Vamos praticar! 🇺🇸\n\nTente falar ou responder:\n"${currentLesson[1]}"\n\nVocê pode usar o microfone ou escrever.`
      }
    ]);

    setTab('practice');
  }

  async function sendMessage(customText) {
    const text =
      typeof customText === 'string'
        ? customText.trim()
        : input.trim();

    if (!text || loading) return;

    const newMessages = [
      ...messages,
      {
        role: 'user',
        content: text
      }
    ];

    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          messages: newMessages,
          lesson: currentLesson[1]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao conectar com a IA.');
      }

      const reply = data.reply;

      setMessages(old => [
        ...old,
        {
          role: 'assistant',
          content: reply
        }
      ]);

      speak(reply);

      setXp(value => value + 2);

    } catch (error) {
      setMessages(old => [
        ...old,
        {
          role: 'assistant',
          content:
            '⚠️ A conexão com a inteligência artificial ainda não está configurada. Vamos configurar o servidor logo depois.'
        }
      ]);
    }

    setLoading(false);
  }

  function startMicrophone() {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setNotice(
        'Seu navegador não oferece reconhecimento de voz. Você ainda pode escrever normalmente.'
      );

      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
      setNotice('🎙️ Ouvindo... fale em inglês.');
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
      setNotice(
        'Não consegui ouvir. Verifique se o Chrome tem permissão para usar o microfone.'
      );
    };

    recognition.onresult = event => {
      const result =
        event.results[0][0].transcript;

      setInput(result);
      setNotice(`Entendi: ${result}`);

      sendMessage(result);
    };

    recognition.start();
  }

  function completeLesson() {
    setXp(value => value + 10);

    setLesson(value =>
      value + 1 >= lessons.length
        ? 0
        : value + 1
    );

    setNotice('⭐ Lição concluída! +10 XP');

    setTab('home');
  }

  function selectLesson(index) {
    setLesson(index);
    setTab('home');
  }

  return (
    <main>

      <header>
        <button
          className="logoButton"
          onClick={() => setTab('home')}
        >
          English <b>IA</b>
        </button>

        <span>
          🔥 1 dia&nbsp;&nbsp;⭐ {xp} XP
        </span>
      </header>

      {notice && (
        <div className="notice">
          {notice}
        </div>
      )}

      {tab === 'home' && (
        <>
          <section className="hero">

            <small>INGLÊS PRÁTICO</small>

            <h1>
              Fale inglês com confiança.
            </h1>

            <p>
              Treinos rápidos para conversas,
              trabalho e entrevistas no exterior.
            </p>

            <div className="progress">
              <i
                style={{
                  width:
                    `${((lesson + 1) / lessons.length) * 100}%`
                }}
              />
            </div>

            <em>
              Lição {lesson + 1} de {lessons.length}
            </em>

          </section>

          <section className="card">

            <label>
              {currentLesson[0]}
            </label>

            <h2>
              {currentLesson[1]}
            </h2>

            <p>
              {currentLesson[2]}
            </p>

            <button
              onClick={() =>
                speak(currentLesson[1])
              }
            >
              🔊 Ouvir pronúncia
            </button>

            <button
              className="primary"
              onClick={openPractice}
            >
              🤖 Praticar com IA
            </button>

          </section>

          <section className="quick">

            <h3>
              Seu objetivo
            </h3>

            <p>
              🇺🇸 Preparação para trabalhar
              e se comunicar no exterior
            </p>

          </section>
        </>
      )}

      {tab === 'practice' && (
        <section className="practicePage">

          <div className="practiceHeader">

            <div>
              <small>
                CONVERSA COM IA
              </small>

              <h1>
                Professor de inglês
              </h1>
            </div>

            <span className="online">
              ● IA
            </span>

          </div>

          <div className="chat">

            {messages.map((message, index) => (

              <div
                key={index}
                className={
                  message.role === 'user'
                    ? 'bubble user'
                    : 'bubble assistant'
                }
              >

                <b>
                  {message.role === 'user'
                    ? 'Você'
                    : 'English IA'}
                </b>

                <p>
                  {message.content}
                </p>

                {message.role === 'assistant' && (
                  <button
                    className="listenSmall"
                    onClick={() =>
                      speak(message.content)
                    }
                  >
                    🔊 Ouvir
                  </button>
                )}

              </div>

            ))}

            {loading && (

              <div className="bubble assistant">
                <b>English IA</b>
                <p>Digitando...</p>
              </div>

            )}

          </div>

          <div className="composer">

            <button
              className={
                listening
                  ? 'mic recording'
                  : 'mic'
              }
              onClick={startMicrophone}
            >
              🎙️
            </button>

            <input
              value={input}
              onChange={event =>
                setInput(event.target.value)
              }
              placeholder="Escreva em inglês..."
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  sendMessage();
                }
              }}
            />

            <button
              className="send"
              onClick={() =>
                sendMessage()
              }
            >
              ➤
            </button>

          </div>

          <button
            className="primary complete"
            onClick={completeLesson}
          >
            ✓ Concluir lição +10 XP
          </button>

        </section>
      )}

      {tab === 'lessons' && (

        <section className="listPage">

          <small>
            TRILHA DE ESTUDO
          </small>

          <h1>
            Lições
          </h1>

          <div className="lessonList">

            {lessons.map((item, index) => (

              <button
                key={index}
                className="lessonItem"
                onClick={() =>
                  selectLesson(index)
                }
              >

                <span className="lessonNumber">
                  {index + 1}
                </span>

                <span>

                  <b>
                    {item[0]}
                  </b>

                  <small>
                    {item[1]}
