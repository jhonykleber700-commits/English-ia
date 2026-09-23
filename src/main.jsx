import React,{useState}from'react';
import{createRoot}from'react-dom/client';
import'./style.css';

const lessons=[
['Cumprimentos','Good morning! How are you?','Bom dia! Como você está?'],
['Apresentação',"Hi, I'm Jhony. Nice to meet you.",'Olá, eu sou Jhony. Prazer em conhecer você.'],
['Entrevista','I have experience operating farm machinery.','Tenho experiência operando máquinas agrícolas.'],
['Entrevista','I am willing to learn and work hard.','Estou disposto a aprender e trabalhar duro.'],
['Comunicação','Could you repeat that more slowly, please?','Pode repetir mais devagar, por favor?'],
['Trabalho','What time does the shift start?','Que horas começa o turno?']
];

function App(){
 const[i,setI]=useState(0);
 const[xp,setXp]=useState(120);
 const[streak]=useState(1);
 const[done,setDone]=useState(false);

 const l=lessons[i];

 function speak(){
  const u=new SpeechSynthesisUtterance(l[1]);
  u.lang='en-US';
  u.rate=.82;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
 }

 function next(){
  if(!done)setXp(v=>v+10);
  setDone(true);

  setTimeout(()=>{
   setI(v=>(v+1)%lessons.length);
   setDone(false);
  },450);
 }

 return (
  <main>
   <header>
    <div className="logo">English <b>IA</b></div>
    <span>🔥 {streak} dia&nbsp;&nbsp;⭐ {xp} XP</span>
   </header>

   <section className="hero">
    <small>INGLÊS PRÁTICO</small>
    <h1>Fale inglês com confiança.</h1>
    <p>Treinos rápidos para conversas, trabalho e entrevistas no exterior.</p>

    <div className="progress">
     <i style={{width:`${(i+1)/lessons.length*100}%`}}/>
    </div>

    <em>Lição {i+1} de {lessons.length}</em>
   </section>

   <section className="card">
    <label>{l[0]}</label>
    <h2>{l[1]}</h2>
    <p>{l[2]}</p>

    <button onClick={speak}>🔊 Ouvir pronúncia</button>

    <button className="primary" onClick={next}>
     {done?'✓ +10 XP':'Praticar e continuar'}
    </button>
   </section>

   <section className="quick">
    <h3>Seu objetivo</h3>
    <p>🇺🇸 Preparação para trabalhar e se comunicar no exterior</p>
   </section>

   <nav>
    <span>🏠<small>Início</small></span>
    <span>💬<small>Praticar</small></span>
    <span>📚<small>Lições</small></span>
    <span>👤<small>Perfil</small></span>
   </nav>
  </main>
 );
}

createRoot(document.getElementById('root')).render(<App/>);
