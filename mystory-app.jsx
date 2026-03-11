import { useState, useRef, useEffect } from "react";

const MODE = { CHAT: "chat", NORMAL: "normal" };
const uid = () => Math.random().toString(36).slice(2, 10);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const T = {
  bg:"#FAFAF8", warm:"#F5F2ED", dark:"#1A1816", card:"#FFF",
  tx:"#1A1816", sub:"#6B6560", mute:"#A8A29E", light:"#D6D3D1",
  accent:"#8B5E34", accentBg:"#FBF7F2", accentBd:"#E8D5BF",
  bd:"#E7E5E0", bdL:"#F0EEEA",
  serif:"'Noto Serif KR',Georgia,serif",
  sans:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  sh:"0 1px 3px rgba(0,0,0,.04)", shL:"0 4px 20px rgba(0,0,0,.06)",
  r:8,
};

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0}
html{-webkit-text-size-adjust:100%;-webkit-tap-highlight-color:transparent}
body{overscroll-behavior-y:none}
input,textarea,select,button{font-size:16px}
textarea{-webkit-appearance:none}
input{-webkit-appearance:none}
::-webkit-scrollbar{width:0;height:0}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes dot{0%,60%,100%{transform:translateY(0);opacity:.3}30%{transform:translateY(-5px);opacity:1}}
@supports(padding:max(0px)){
  .sa-b{padding-bottom:max(14px,env(safe-area-inset-bottom))!important}
  .sa-b-lg{padding-bottom:max(20px,calc(env(safe-area-inset-bottom)+8px))!important}
}
`;

const IconMenu = () => (<svg width="20" height="16" viewBox="0 0 20 16" fill="none"><path d="M1 1h18M1 8h18M1 15h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>);
const IconAI = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconPhoto = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>);
const IconMic = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M5 10a7 7 0 0014 0M12 18v4m-3 0h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>);
const IconSend = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);

const TOPICS=[
  {cat:"탄생과 뿌리",en:"ORIGIN",cards:[
    {id:"birth-story",t:"나의 탄생 이야기"},{id:"my-name",t:"이름의 의미"},
    {id:"parents-story",t:"부모님의 이야기"},{id:"grandparents",t:"조부모님의 기억"},
    {id:"family-roots",t:"가문과 고향"},{id:"siblings",t:"형제자매"},
  ]},
  {cat:"유년시절",en:"CHILDHOOD",cards:[
    {id:"first-memory",t:"가장 오래된 기억"},{id:"childhood-home",t:"자란 집과 동네"},
    {id:"childhood-play",t:"놀이와 장난"},{id:"childhood-food",t:"어린 시절의 맛"},
    {id:"childhood-fear",t:"무서웠던 것들"},{id:"childhood-dream",t:"어릴 적 꿈"},
    {id:"seasons",t:"계절의 기억"},{id:"family-culture",t:"우리 집만의 문화"},
  ]},
  {cat:"학창시절",en:"SCHOOL DAYS",cards:[
    {id:"elementary",t:"초등학교"},{id:"middle-school",t:"중학교 시절"},
    {id:"high-school",t:"고등학교 시절"},{id:"best-friend",t:"가장 친한 친구"},
    {id:"teacher",t:"잊지 못할 선생님"},{id:"school-event",t:"운동회와 소풍"},
    {id:"school-trouble",t:"사고친 이야기"},{id:"first-love",t:"풋풋한 첫사랑"},
  ]},
  {cat:"청년기",en:"YOUTH",cards:[
    {id:"college",t:"대학 시절"},{id:"military",t:"군대 이야기"},
    {id:"first-job",t:"첫 직장"},{id:"first-salary",t:"첫 월급"},
    {id:"independence",t:"독립과 자취"},{id:"youth-passion",t:"열정과 도전"},
    {id:"youth-failure",t:"실패와 좌절"},{id:"dating",t:"연애 이야기"},
    {id:"life-mentor",t:"인생의 멘토"},
  ]},
  {cat:"사랑과 가정",en:"LOVE & FAMILY",cards:[
    {id:"spouse-meeting",t:"배우자와의 만남"},{id:"proposal",t:"프러포즈와 결혼식"},
    {id:"newlywed",t:"신혼 시절"},{id:"first-child",t:"첫 아이의 탄생"},
    {id:"parenting",t:"육아 에피소드"},{id:"family-crisis",t:"가정의 위기"},
    {id:"family-trip",t:"가족 여행"},{id:"family-tradition",t:"가족의 전통"},
    {id:"children-grown",t:"자녀의 성장"},
  ]},
  {cat:"일과 커리어",en:"CAREER",cards:[
    {id:"career-path",t:"나의 직업 이야기"},{id:"career-turning",t:"커리어 전환점"},
    {id:"career-pride",t:"가장 뿌듯한 성과"},{id:"career-hardship",t:"가장 힘들었던 시기"},
    {id:"work-people",t:"함께한 사람들"},{id:"money-story",t:"돈에 대한 이야기"},
    {id:"retirement",t:"은퇴와 그 이후"},
  ]},
  {cat:"시대와 역사 속의 나",en:"HISTORY & ME",cards:[
    {id:"era-childhood",t:"그 시절 대한민국"},{id:"historical-event",t:"역사적 사건과 나"},
    {id:"tech-change",t:"기술 변화의 목격자"},{id:"social-change",t:"사회 변화 속의 삶"},
    {id:"war-division",t:"전쟁과 분단의 기억"},
  ]},
  {cat:"내면의 풍경",en:"INNER LANDSCAPE",cards:[
    {id:"faith",t:"신앙과 영성"},{id:"values",t:"삶의 가치관"},
    {id:"health-story",t:"건강 이야기"},{id:"loss-grief",t:"상실과 이별"},
    {id:"turning-point",t:"인생의 전환점"},{id:"regret",t:"후회와 용서"},
    {id:"gratitude",t:"감사한 사람들"},
  ]},
  {cat:"취미와 즐거움",en:"JOY & LEISURE",cards:[
    {id:"hobby",t:"나의 취미"},{id:"travel",t:"여행 이야기"},
    {id:"books-movies",t:"책과 영화"},{id:"music",t:"내 인생의 음악"},
    {id:"food-story",t:"음식 이야기"},{id:"pets",t:"반려동물"},
  ]},
  {cat:"오늘, 그리고 내일",en:"TODAY & TOMORROW",cards:[
    {id:"daily-life",t:"요즘의 하루"},{id:"grandchildren",t:"손주 이야기"},
    {id:"bucket-list",t:"아직 이루고 싶은 것"},{id:"life-wisdom",t:"인생에서 배운 것"},
    {id:"letter-children",t:"자녀에게 보내는 편지"},{id:"letter-future",t:"미래의 나에게"},
    {id:"epitaph",t:"나를 한 문장으로"},
  ]},
];

const Q={
  "birth-story":["몇 년도에, 어디에서 태어나셨어요?","태어나실 때의 이야기를 들은 적 있나요?","부모님이 그때 어떤 마음이셨는지 들으신 적 있어요?"],
  "parents-story":["아버지는 어떤 분이셨어요?","어머니의 손길 중 가장 그리운 건 뭔가요?","부모님에게 하지 못한 말이 있다면요?"],
  "first-memory":["기억이 닿는 가장 먼 과거, 어떤 장면이 떠오르시나요?","그 기억 속 어떤 소리가 들리나요?","그때 옆에 누가 있었나요?"],
  "childhood-home":["자라신 집은 어떤 집이었어요?","동네를 눈 감고 떠올려보면 어떤 풍경이 보이나요?"],
  "best-friend":["인생의 가장 친한 친구는 어떻게 만났나요?","그 친구와 가장 기억에 남는 순간은요?"],
  "spouse-meeting":["배우자를 처음 만났을 때를 기억하시나요?","이 사람이다 느낀 순간이 있었나요?"],
  "life-wisdom":["인생에서 가장 중요하게 깨달은 것은요?","젊은 사람들에게 꼭 해주고 싶은 조언이 있다면요?"],
  "epitaph":["나를 한 문장으로 표현한다면요?","사람들이 어떤 사람으로 기억해주면 좋겠나요?"],
  _:["이 시절 가장 먼저 떠오르는 기억이 있나요?","그때 곁에 누가 있었나요?","기억에 남는 에피소드를 들려주세요.","그 경험이 지금의 나에게 어떤 의미인가요?"],
};
const REACTIONS=["정말 좋은 이야기네요.","그랬군요...","듣기만 해도 눈에 보이는 것 같아요.","참 귀한 기억이시네요.","그 마음이 느껴지는 것 같아요.","마음이 따뜻해지네요."];
const getQ = (id) => (Q[id] || Q._);

const FS = {
  normal: { label:"일반", body:16, chat:16, prose:17, input:16, book:17, lh:2.0 },
  large:  { label:"확대", body:19, chat:19, prose:20, input:18, book:20, lh:2.2 },
};

/* ── STT 모드 설정 ── */
const STT_MODES = {
  browser: { label:"브라우저 음성인식", desc:"무료, Chrome/Safari 내장" },
  whisper: { label:"Whisper AI", desc:"고정밀, API 연동 필요" },
  off:     { label:"사용 안 함", desc:"녹음 버튼 숨김" },
};

/* ── Web Speech API 훅 ── */
function useSpeechRecognition(sttMode) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const recRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SR);
    if (!SR) return;
    const r = new SR();
    r.lang = "ko-KR";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let final = "", interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      setTranscript(final + interim);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") console.warn("STT error:", e.error);
      setIsListening(false);
    };
    r.onend = () => { setIsListening(false); };
    recRef.current = r;
    return () => { try { r.abort(); } catch(e){} };
  }, []);

  const start = () => {
    if (!recRef.current || sttMode !== "browser") return;
    setTranscript("");
    try { recRef.current.start(); setIsListening(true); } catch(e){}
  };
  const stop = () => {
    if (!recRef.current) return;
    try { recRef.current.stop(); } catch(e){}
    setIsListening(false);
  };
  const toggle = () => { isListening ? stop() : start(); };

  return { isListening, transcript, supported, toggle, stop };
}

function Lbl({ children }) {
  return (
    <label style={{display:"block",fontSize:11,color:T.mute,marginBottom:6,fontFamily:T.sans,letterSpacing:2}}>{children}</label>
  );
}

function SmBtn({ children, onClick, danger }) {
  return (
    <button onClick={onClick} style={{width:32,height:32,border:`1px solid ${danger?"#D4A0A0":T.bd}`,borderRadius:5,background:danger?"#FFF8F8":T.card,cursor:"pointer",fontSize:13,color:danger?"#9B2C2C":T.sub,display:"flex",alignItems:"center",justifyContent:"center"}}>{children}</button>
  );
}

function ModeTab({ mode, onChange }) {
  const Btn = ({ m, label }) => {
    const on = mode === m;
    return (
      <button onClick={() => onChange(m)} style={{flex:1,padding:"8px 0",border:"none",fontSize:12,fontWeight:on?600:400,cursor:"pointer",fontFamily:T.sans,borderRadius:6,background:on?T.card:"transparent",color:on?T.tx:T.mute,boxShadow:on?T.sh:"none",minHeight:34}}>{label}</button>
    );
  };
  return (
    <div style={{display:"flex",gap:2,padding:3,background:T.warm,borderRadius:8,minWidth:160}}>
      <Btn m={MODE.CHAT} label="대화 모드"/>
      <Btn m={MODE.NORMAL} label="일반 모드"/>
    </div>
  );
}

function IcoBtn({ children, onClick, active }) {
  return (
    <button onClick={onClick} style={{width:44,height:44,border:`1px solid ${active?"#FECACA":T.bd}`,borderRadius:"50%",background:active?"#FEF2F2":T.card,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:active?"#DC2626":T.sub,flexShrink:0}}>{children}</button>
  );
}

function ToolBtn({ icon, label, onClick, active }) {
  return (
    <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:4,padding:"8px 12px",border:`1px solid ${active?"#FECACA":T.bd}`,borderRadius:6,background:active?"#FEF2F2":T.card,cursor:"pointer",fontSize:13,fontFamily:T.sans,color:active?"#991B1B":T.sub,minHeight:36}}>{icon}<span style={{marginLeft:2}}>{label}</span></button>
  );
}

/* ═══════ APP ═══════ */
export default function App() {
  const [phase, setPhase] = useState("landing");
  const [sel, setSel] = useState([]);
  const [chs, setChs] = useState([]);
  const [idx, setIdx] = useState(0);
  const [title, setTitle] = useState("나의 이야기");
  const [author, setAuthor] = useState("");
  const [fs, setFs] = useState("normal");
  const [sttMode, setSttMode] = useState("browser");
  const S = FS[fs];

  const build = () => {
    setChs(sel.map(s => ({id:uid(),tid:s.id,title:s.t,custom:!!s.custom,msgs:[],prose:"",photos:[],mode:MODE.CHAT,done:false})));
    setPhase("toc");
  };

  return (
    <div style={{minHeight:"100dvh",background:T.bg,fontFamily:T.serif,color:T.tx}}>
      <style>{CSS}</style>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600;700&display=swap" rel="stylesheet"/>
      {phase === "landing" && <Landing onGo={() => setPhase("select")} title={title} setTitle={setTitle} author={author} setAuthor={setAuthor}/>}
      {phase === "select" && <SelectPage sel={sel} setSel={setSel} onDone={build}/>}
      {phase === "toc" && <TocPage chs={chs} setChs={setChs} onStart={() => {setIdx(0);setPhase("write");}} onBack={() => setPhase("select")}/>}
      {phase === "write" && <WritePage chs={chs} setChs={setChs} idx={idx} setIdx={setIdx} onBook={() => setPhase("book")} S={S} fs={fs} setFs={setFs} sttMode={sttMode} setSttMode={setSttMode}/>}
      {phase === "book" && <BookPage chs={chs} title={title} author={author} onBack={() => setPhase("write")} S={S}/>}
    </div>
  );
}

/* ═══════ LANDING ═══════ */
function Landing({ onGo, title, setTitle, author, setAuthor }) {
  const inp = {width:"100%",padding:"14px 16px",border:`1px solid ${T.bd}`,borderRadius:T.r,fontSize:16,fontFamily:T.serif,outline:"none",background:T.card,color:T.tx};
  return (
    <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1.25rem",background:`linear-gradient(180deg,${T.bg},${T.warm})`}}>
      <div style={{textAlign:"center",maxWidth:420,width:"100%"}}>
        <div style={{width:48,height:1,background:T.tx,margin:"0 auto 28px",opacity:.2}}/>
        <h1 style={{fontSize:"clamp(2rem,7vw,2.6rem)",fontWeight:300,letterSpacing:"-0.03em",lineHeight:1.2,marginBottom:6}}>나의이야기</h1>
        <p style={{fontSize:12,fontFamily:T.sans,color:T.mute,letterSpacing:4,marginBottom:20}}>MY STORY</p>
        <p style={{fontSize:"clamp(14px,3.8vw,15px)",color:T.sub,lineHeight:1.9,fontWeight:300,marginBottom:36}}>
          당신의 인생을 한 권의 책으로.<br/>대화하듯 쉽게, 자서전을 완성하세요.
        </p>
        <div style={{background:T.card,borderRadius:12,padding:"24px 20px",boxShadow:T.shL,textAlign:"left",border:`1px solid ${T.bdL}`}}>
          <Lbl>BOOK TITLE</Lbl>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="나의 이야기" style={{...inp,marginBottom:16}}/>
          <Lbl>AUTHOR</Lbl>
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="홍길동" style={inp}/>
        </div>
        <button onClick={onGo} style={{width:"100%",padding:16,background:T.dark,color:"#FAFAF9",border:"none",borderRadius:T.r,fontSize:15,fontFamily:T.sans,fontWeight:500,cursor:"pointer",marginTop:16,minHeight:52}}>시작하기</button>
      </div>
    </div>
  );
}

/* ═══════ SELECT ═══════ */
function SelectPage({ sel, setSel, onDone }) {
  const [search, setSearch] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [exp, setExp] = useState(null);
  const toggle = (c) => {const i=sel.findIndex(s=>s.id===c.id);i>=0?setSel(sel.filter(s=>s.id!==c.id)):setSel([...sel,c]);};
  const order = (id) => {const i=sel.findIndex(s=>s.id===id);return i>=0?i+1:0;};
  const addCustom = () => {if(!customTitle.trim())return;setSel([...sel,{id:`c-${uid()}`,t:customTitle.trim(),custom:true}]);setCustomTitle("");setShowCustom(false);};
  const filtered = search.trim() ? TOPICS.map(g=>({...g,cards:g.cards.filter(c=>c.t.includes(search))})).filter(g=>g.cards.length>0) : TOPICS;

  return (
    <div style={{minHeight:"100dvh",background:T.bg}}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"rgba(250,250,248,.97)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${T.bdL}`,padding:"16px 16px 12px"}}>
        <div style={{maxWidth:560,margin:"0 auto"}}>
          <Lbl>CHAPTER SELECTION</Lbl>
          <h2 style={{fontSize:"clamp(1.1rem,4.5vw,1.3rem)",fontWeight:400,margin:"4px 0 12px"}}>이야기할 주제를 선택하세요</h2>
          <div style={{display:"flex",gap:8}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="주제 검색..." style={{flex:1,padding:"11px 14px",border:`1px solid ${T.bd}`,borderRadius:T.r,fontSize:16,fontFamily:T.sans,outline:"none",background:T.card,minHeight:44}}/>
            <button onClick={()=>setShowCustom(!showCustom)} style={{padding:"11px 14px",border:`1px solid ${showCustom?T.accent:T.bd}`,borderRadius:T.r,background:showCustom?T.accentBg:T.card,color:showCustom?T.accent:T.sub,fontSize:13,cursor:"pointer",fontFamily:T.sans,whiteSpace:"nowrap",minHeight:44}}>+ 직접 추가</button>
          </div>
        </div>
      </div>

      {showCustom && (
        <div style={{maxWidth:560,margin:"10px auto 0",padding:"0 16px"}}>
          <div style={{padding:16,background:T.accentBg,border:`1px solid ${T.accentBd}`,borderRadius:10}}>
            <Lbl>CUSTOM CHAPTER</Lbl>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <input value={customTitle} onChange={e=>setCustomTitle(e.target.value)} placeholder="예: 나의 요리 이야기..." style={{flex:1,padding:"12px 14px",border:`1px solid ${T.accentBd}`,borderRadius:T.r,fontSize:16,fontFamily:T.sans,outline:"none",minHeight:44}} onKeyDown={e=>{if(e.key==="Enter")addCustom();}}/>
              <button onClick={addCustom} disabled={!customTitle.trim()} style={{padding:"12px 18px",background:customTitle.trim()?T.accent:"#ccc",color:"#fff",border:"none",borderRadius:T.r,fontSize:14,fontFamily:T.sans,cursor:customTitle.trim()?"pointer":"default",minHeight:44}}>추가</button>
            </div>
          </div>
        </div>
      )}

      <div style={{padding:"8px 16px 200px",maxWidth:560,margin:"0 auto"}}>
        {filtered.map((g, gi) => {
          const isExp = exp === g.cat || search.trim().length > 0;
          const cnt = g.cards.filter(c => order(c.id) > 0).length;
          return (
            <div key={g.cat}>
              <button onClick={() => setExp(isExp && !search ? null : g.cat)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"14px 2px",border:"none",borderBottom:`1px solid ${T.bdL}`,background:"transparent",cursor:"pointer",fontFamily:T.sans,textAlign:"left",minHeight:52}}>
                <span style={{fontSize:11,color:T.mute,fontWeight:600,letterSpacing:2,minWidth:26}}>{String(gi+1).padStart(2,"0")}</span>
                <span style={{flex:1}}>
                  <span style={{fontSize:15,fontWeight:500,color:T.tx,fontFamily:T.serif}}>{g.cat}</span><br/>
                  <span style={{fontSize:10,color:T.mute,letterSpacing:1.5}}>{g.en}</span>
                </span>
                {cnt > 0 && <span style={{fontSize:10,fontFamily:T.sans,fontWeight:600,color:T.accent,background:T.accentBg,padding:"3px 10px",borderRadius:20,border:`1px solid ${T.accentBd}`}}>{cnt}</span>}
                <span style={{color:T.mute,fontSize:12}}>{isExp ? "−" : "+"}</span>
              </button>
              {isExp && (
                <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"10px 0 14px 38px"}}>
                  {g.cards.map(c => {
                    const o = order(c.id);
                    const on = o > 0;
                    return (
                      <button key={c.id} onClick={() => toggle(c)} style={{position:"relative",padding:"10px 16px",border:`1px solid ${on?T.dark:T.bd}`,borderRadius:6,background:on?T.dark:T.card,color:on?"#FAFAF9":T.tx,fontSize:14,cursor:"pointer",fontFamily:T.sans,minHeight:42}}>
                        {on && <span style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:"50%",background:T.accent,color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{o}</span>}
                        {c.t}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sel.length > 0 && (
        <div className="sa-b-lg" style={{position:"fixed",bottom:0,left:0,right:0,background:T.card,borderTop:`1px solid ${T.bd}`,padding:"10px 16px 14px",boxShadow:"0 -6px 24px rgba(0,0,0,.05)"}}>
          <div style={{maxWidth:560,margin:"0 auto"}}>
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10}}>
              {sel.map((s, i) => (
                <span key={s.id} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 12px",background:s.custom?T.accentBg:T.warm,border:s.custom?`1px solid ${T.accentBd}`:"none",borderRadius:5,fontSize:12,whiteSpace:"nowrap",fontFamily:T.sans,color:T.sub}}>
                  <span style={{color:T.accent,fontWeight:700}}>{String(i+1).padStart(2,"0")}</span>{s.t}
                  <button onClick={() => setSel(sel.filter(x=>x.id!==s.id))} style={{background:"none",border:"none",fontSize:11,color:T.mute,cursor:"pointer",padding:"2px 0 2px 4px"}}>×</button>
                </span>
              ))}
            </div>
            <button onClick={onDone} style={{width:"100%",padding:14,background:T.dark,color:"#FAFAF9",border:"none",borderRadius:T.r,fontSize:15,fontWeight:500,cursor:"pointer",fontFamily:T.sans,minHeight:50}}>{sel.length}개 챕터로 목차 구성</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════ TOC ═══════ */
function TocPage({ chs, setChs, onStart, onBack }) {
  const swap = (i, d) => {const j=i+d;if(j<0||j>=chs.length)return;const a=[...chs];[a[i],a[j]]=[a[j],a[i]];setChs(a);};
  return (
    <div style={{minHeight:"100dvh",background:T.bg,padding:"0 16px"}}>
      <div style={{maxWidth:480,margin:"0 auto",paddingTop:28,paddingBottom:110}}>
        <button onClick={onBack} style={{background:"none",border:"none",fontSize:14,color:T.sub,cursor:"pointer",fontFamily:T.sans,marginBottom:20,padding:"8px 0",minHeight:44,display:"flex",alignItems:"center"}}>← 주제 다시 선택</button>
        <Lbl>TABLE OF CONTENTS</Lbl>
        <h2 style={{fontSize:"1.3rem",fontWeight:400,margin:"4px 0 20px"}}>목차를 확인하세요</h2>
        {chs.map((c, i) => (
          <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"14px",marginBottom:5,background:T.card,borderRadius:T.r,border:c.custom?`1px dashed ${T.accent}`:`1px solid ${T.bdL}`,boxShadow:T.sh}}>
            <span style={{fontSize:12,fontWeight:600,color:T.mute,fontFamily:T.sans,minWidth:22}}>{String(i+1).padStart(2,"0")}</span>
            <span style={{flex:1,fontSize:15}}>{c.title}</span>
            {c.custom && <span style={{fontSize:9,padding:"2px 7px",borderRadius:3,color:T.accent,border:`1px solid ${T.accentBd}`,fontFamily:T.sans}}>CUSTOM</span>}
            <SmBtn onClick={() => swap(i,-1)}>↑</SmBtn>
            <SmBtn onClick={() => swap(i,1)}>↓</SmBtn>
            <SmBtn onClick={() => setChs(chs.filter((_,j)=>j!==i))} danger>×</SmBtn>
          </div>
        ))}
      </div>
      <div className="sa-b-lg" style={{position:"fixed",bottom:0,left:0,right:0,padding:"14px 16px",background:T.card,borderTop:`1px solid ${T.bd}`}}>
        <div style={{maxWidth:480,margin:"0 auto"}}>
          <button onClick={onStart} style={{width:"100%",padding:14,background:T.dark,color:"#FAFAF9",border:"none",borderRadius:T.r,fontSize:15,fontFamily:T.sans,fontWeight:500,cursor:"pointer",minHeight:50}}>이야기 시작하기</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════ WRITE PAGE ═══════ */
function WritePage({ chs, setChs, idx, setIdx, onBook, S, fs, setFs, sttMode, setSttMode }) {
  const ch = chs[idx];
  const [sidebar, setSidebar] = useState(false);
  const mode = ch?.mode || MODE.CHAT;
  const setMode = (m) => setChs(chs.map((c,i) => i===idx ? {...c,mode:m} : c));
  const upd = (fn) => setChs(chs.map((c,i) => i===idx ? fn(c) : c));
  const finish = () => {
    const prose = mode===MODE.CHAT ? ch.msgs.filter(m=>m.type==="user").map(m=>m.text).join("\n\n") : (ch.prose||"");
    setChs(chs.map((c,i) => i===idx ? {...c,done:true,prose} : c));
    if (idx < chs.length-1) setIdx(idx+1); else onBook();
  };

  return (
    <div style={{height:"100dvh",display:"flex",flexDirection:"column",background:mode===MODE.CHAT?T.warm:T.bg}}>
      <div style={{flexShrink:0,background:T.bg,borderBottom:`1px solid ${T.bdL}`}}>
        <div style={{display:"flex",alignItems:"center",padding:"8px 10px 2px",gap:6}}>
          <button onClick={() => setSidebar(!sidebar)} style={{background:"none",border:"none",cursor:"pointer",color:T.sub,padding:6,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}><IconMenu/></button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ch?.title}</div>
            <div style={{fontSize:11,color:T.mute,fontFamily:T.sans}}>{String(idx+1).padStart(2,"0")} / {String(chs.length).padStart(2,"0")}</div>
          </div>
          <button onClick={finish} style={{background:T.dark,color:"#FAFAF9",border:"none",borderRadius:6,padding:"9px 16px",fontSize:13,cursor:"pointer",fontFamily:T.sans,fontWeight:500,whiteSpace:"nowrap",flexShrink:0,minHeight:40}}>
            {idx < chs.length-1 ? "다음 장 →" : "완성"}
          </button>
        </div>
        <div style={{display:"flex",justifyContent:"center",padding:"4px 16px 10px"}}>
          <ModeTab mode={mode} onChange={setMode}/>
        </div>
      </div>

      {sidebar && (
        <div style={{position:"fixed",inset:0,zIndex:100,display:"flex"}}>
          <div style={{width:"min(300px,85vw)",background:T.card,height:"100%",boxShadow:"4px 0 24px rgba(0,0,0,.08)",padding:"24px 16px",overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <Lbl>CONTENTS</Lbl>
            <h3 style={{fontSize:16,fontWeight:400,margin:"4px 0 16px"}}>목차</h3>
            <div style={{flex:1,overflowY:"auto"}}>
              {chs.map((c, i) => (
                <button key={c.id} onClick={() => {setIdx(i);setSidebar(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"12px",border:i===idx?`1.5px solid ${T.dark}`:`1px solid ${T.bdL}`,borderRadius:T.r,background:c.done?"#F7FCF7":T.card,cursor:"pointer",marginBottom:5,fontFamily:T.sans,fontSize:14,textAlign:"left",minHeight:48}}>
                  <span style={{fontSize:11,color:T.mute,fontWeight:600,minWidth:20}}>{String(i+1).padStart(2,"0")}</span>
                  <span style={{flex:1}}>{c.title}</span>
                  <span style={{fontSize:9,padding:"2px 7px",borderRadius:3,border:`1px solid ${c.mode===MODE.CHAT?T.accentBd:"#C7D2FE"}`,color:c.mode===MODE.CHAT?T.accent:"#4338CA",fontWeight:500}}>{c.mode===MODE.CHAT?"CHAT":"EDIT"}</span>
                  {c.done && <span style={{fontSize:11,color:"#166534"}}>✓</span>}
                </button>
              ))}
            </div>
            <div style={{borderTop:`1px solid ${T.bdL}`,paddingTop:16,marginTop:12}}>
              <Lbl>TEXT SIZE</Lbl>
              <div style={{display:"flex",gap:6,marginTop:6}}>
                {Object.entries(FS).map(([key, val]) => {
                  const on = fs === key;
                  return (
                    <button key={key} onClick={() => setFs(key)} style={{flex:1,padding:"10px 0",border:`1.5px solid ${on?T.dark:T.bd}`,borderRadius:6,background:on?T.dark:T.card,color:on?"#FAFAF9":T.tx,cursor:"pointer",fontFamily:T.sans,fontSize:13,fontWeight:on?600:400,minHeight:44,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <span style={{fontSize:key==="large"?17:13,fontWeight:600,lineHeight:1}}>가</span>
                      <span style={{fontSize:10,opacity:.7}}>{val.label}</span>
                    </button>
                  );
                })}
              </div>
              <p style={{fontSize:11,color:T.mute,fontFamily:T.sans,marginTop:8,lineHeight:1.5}}>대화, 글쓰기, 책 보기의 글자 크기가 변경됩니다.</p>
            </div>
            {/* ── 음성인식 설정 ── */}
            <div style={{borderTop:`1px solid ${T.bdL}`,paddingTop:16,marginTop:12}}>
              <Lbl>VOICE INPUT</Lbl>
              <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:6}}>
                {Object.entries(STT_MODES).map(([key, val]) => {
                  const on = sttMode === key;
                  const disabled = key === "whisper";
                  return (
                    <button key={key} onClick={() => !disabled && setSttMode(key)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",border:`1.5px solid ${on?T.dark:T.bd}`,borderRadius:6,background:on?T.dark:T.card,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,textAlign:"left"}}>
                      <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${on?"#FAFAF9":T.bd}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {on && <div style={{width:8,height:8,borderRadius:"50%",background:on?"#FAFAF9":T.dark}}/>}
                      </div>
                      <div>
                        <div style={{fontSize:13,fontFamily:T.sans,fontWeight:on?600:400,color:on?"#FAFAF9":T.tx}}>{val.label}</div>
                        <div style={{fontSize:10,color:on?"rgba(250,250,249,.6)":T.mute,fontFamily:T.sans}}>{disabled?"추후 지원 예정":val.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={onBook} style={{width:"100%",padding:14,background:T.dark,color:"#FAFAF9",border:"none",borderRadius:T.r,marginTop:14,cursor:"pointer",fontFamily:T.sans,fontWeight:500,fontSize:14,minHeight:48}}>책 미리보기</button>
          </div>
          <div onClick={() => setSidebar(false)} style={{flex:1,background:"rgba(0,0,0,.25)"}}/>
        </div>
      )}

      {mode === MODE.CHAT ? <ChatEd ch={ch} upd={upd} S={S} sttMode={sttMode}/> : <NormalEd ch={ch} upd={upd} S={S} sttMode={sttMode}/>}
    </div>
  );
}

/* ═══════ CHAT EDITOR ═══════ */
function ChatEd({ ch, upd, S, sttMode }) {
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const qI = useRef(0);
  const fileRef = useRef(null);
  const stt = useSpeechRecognition(sttMode);

  /* 음성인식 결과를 실시간으로 input에 반영 */
  useEffect(() => {
    if (stt.transcript) setInput(stt.transcript);
  }, [stt.transcript]);

  useEffect(() => {
    if (ch && ch.msgs.length === 0) {
      qI.current = 0;
      setTyping(true);
      const t = setTimeout(() => {
        const qs = getQ(ch.tid);
        upd(c => ({...c, msgs:[...c.msgs, {id:uid(),type:"ai",text:`안녕하세요. "${ch.title}" 이야기를 들려주세요.\n\n${qs[0]}`,ts:Date.now()}]}));
        qI.current = 1;
        setTyping(false);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [ch?.id]);

  useEffect(() => {
    setTimeout(() => endRef.current?.scrollIntoView({behavior:"smooth"}), 100);
  }, [ch?.msgs?.length]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    const userMsg = {id:uid(),type:"user",text:t,ts:Date.now()};
    /* 사용자 메시지 즉시 추가 */
    upd(c => ({...c, msgs:[...c.msgs, userMsg]}));
    setInput("");
    setTyping(true);

    /* 다음 질문 인덱스를 미리 확정 */
    const nextQI = qI.current;
    qI.current = qI.current + 1;

    setTimeout(() => {
      const qs = getQ(ch.tid);
      const nextQ = nextQI < qs.length ? qs[nextQI] : qs[qs.length - 1];
      const aiMsg = {id:uid(),type:"ai",text:`${pick(REACTIONS)}\n\n${nextQ}`,ts:Date.now()};
      /* upd 콜백으로 최신 상태 기반 추가 — stale closure 방지 */
      upd(c => ({...c, msgs:[...c.msgs, aiMsg]}));
      setTyping(false);
    }, 1000 + Math.random() * 800);
  };

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const photoMsg = {id:uid(),type:"photo",text:"",ts:Date.now(),url:ev.target.result};
      upd(c => ({...c, msgs:[...c.msgs, photoMsg]}));
      setTyping(true);
      setTimeout(() => {
        const aiMsg = {id:uid(),type:"ai",text:"소중한 사진이네요.\n\n이 사진은 언제, 어디서 찍은 건가요?",ts:Date.now()};
        upd(c => ({...c, msgs:[...c.msgs, aiMsg]}));
        setTyping(false);
      }, 1200);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const voice = () => { stt.toggle(); };

  return (
    <>
      <div style={{flex:1,overflowY:"auto",padding:"12px 12px",display:"flex",flexDirection:"column",gap:10,overscrollBehavior:"contain"}}>
        {ch?.msgs.map(m => (
          <div key={m.id} style={{display:"flex",justifyContent:m.type==="user"||m.type==="photo"?"flex-end":m.type==="system"?"center":"flex-start"}}>
            {m.type === "ai" && (
              <div style={{display:"flex",gap:8,maxWidth:"85%"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:T.dark,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><IconAI/></div>
                <div style={{background:T.card,borderRadius:"3px 16px 16px 16px",padding:"12px 14px",fontSize:S.chat,lineHeight:1.8,boxShadow:T.sh,whiteSpace:"pre-wrap"}}>{m.text}</div>
              </div>
            )}
            {m.type === "user" && (
              <div style={{background:T.dark,borderRadius:"16px 3px 16px 16px",padding:"12px 14px",maxWidth:"80%",fontSize:S.chat,lineHeight:1.8,whiteSpace:"pre-wrap",color:"#FAFAF9"}}>{m.text}</div>
            )}
            {m.type === "photo" && (
              <div style={{borderRadius:"16px 3px 16px 16px",overflow:"hidden",maxWidth:"70%",boxShadow:T.shL}}><img src={m.url} alt="" style={{width:"100%",display:"block"}}/></div>
            )}
            {m.type === "system" && (
              <div style={{background:"rgba(0,0,0,.04)",borderRadius:20,padding:"5px 14px",fontSize:12,color:T.sub,fontFamily:T.sans}}>{m.text}</div>
            )}
          </div>
        ))}
        {typing && (
          <div style={{display:"flex",gap:8}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:T.dark,display:"flex",alignItems:"center",justifyContent:"center"}}><IconAI/></div>
            <div style={{background:T.card,borderRadius:"3px 16px 16px 16px",padding:"12px 18px",boxShadow:T.sh}}>
              <div style={{display:"flex",gap:5,height:18,alignItems:"center"}}>{[0,1,2].map(i => (<div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.mute,animation:`dot 1.2s ${i*.15}s infinite`}}/>))}</div>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {stt.isListening && (
        <div style={{padding:"10px 16px",background:"#FEF2F2",borderTop:"1px solid #FECACA",display:"flex",alignItems:"center",gap:10,fontFamily:T.sans,flexShrink:0}}>
          <span style={{width:10,height:10,borderRadius:"50%",background:"#DC2626",animation:"pulse 1s infinite"}}/><span style={{fontSize:13,color:"#991B1B"}}>음성 인식 중...</span>
          {stt.transcript && <span style={{fontSize:12,color:T.sub,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{stt.transcript}"</span>}
        </div>
      )}

      <div className="sa-b" style={{display:"flex",alignItems:"flex-end",gap:6,padding:"8px 10px 12px",background:T.bg,borderTop:`1px solid ${T.bdL}`,flexShrink:0}}>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFileSelect} style={{display:"none"}}/>
        <IcoBtn onClick={() => fileRef.current?.click()}><IconPhoto/></IcoBtn>
        {sttMode !== "off" && <IcoBtn onClick={voice} active={stt.isListening}><IconMic/></IcoBtn>}
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => {if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder="이야기를 들려주세요..." rows={1} style={{flex:1,padding:"11px 14px",border:`1px solid ${T.bd}`,borderRadius:20,fontSize:Math.max(16,S.input),fontFamily:T.serif,resize:"none",outline:"none",lineHeight:1.5,maxHeight:120,minHeight:44,background:T.card}}/>
        <button onClick={send} disabled={!input.trim()} style={{width:44,height:44,border:"none",borderRadius:"50%",background:input.trim()?T.dark:"#D6D3D1",color:"#fff",cursor:input.trim()?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><IconSend/></button>
      </div>
    </>
  );
}

/* ═══════ NORMAL EDITOR ═══════ */
function NormalEd({ ch, upd, S, sttMode }) {
  const [guide, setGuide] = useState(!(ch.prose?.length > 0));
  const fileRef = useRef(null);
  const stt = useSpeechRecognition(sttMode);
  const initial = ch.prose || (ch.msgs.length > 0 ? ch.msgs.filter(m=>m.type==="user").map(m=>m.text).join("\n\n") : "");

  /* 음성인식 결과를 prose에 추가 — 인식 종료 시 한번에 */
  const prevTranscript = useRef("");
  useEffect(() => {
    if (!stt.isListening && stt.transcript && stt.transcript !== prevTranscript.current) {
      const text = stt.transcript.trim();
      if (text) {
        upd(c => ({...c, prose: (c.prose || "") + (c.prose ? "\n\n" : "") + text}));
        if (guide) setGuide(false);
      }
      prevTranscript.current = stt.transcript;
    }
  }, [stt.isListening, stt.transcript]);

  const onChange = (e) => { upd(c => ({...c, prose: e.target.value})); if(guide) setGuide(false); };
  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      upd(c => ({...c, photos:[...(c.photos||[]),{id:uid(),url:ev.target.result,caption:""}]}));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const voice = () => { stt.toggle(); };

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:T.bg,borderBottom:`1px solid ${T.bdL}`,flexShrink:0}}>
        <ToolBtn icon={<IconPhoto/>} label="사진" onClick={() => fileRef.current?.click()}/>
        {sttMode !== "off" && <ToolBtn icon={<IconMic/>} label={stt.isListening?"중지":"녹음"} onClick={voice} active={stt.isListening}/>}
        <input ref={fileRef} type="file" accept="image/*" onChange={onFileSelect} style={{display:"none"}}/>
        <div style={{flex:1}}/>
        <span style={{fontSize:11,color:T.mute,fontFamily:T.sans}}>{(ch.prose||"").length}자</span>
        {!guide && <button onClick={() => setGuide(true)} style={{background:"none",border:"none",fontSize:12,color:T.mute,cursor:"pointer",fontFamily:T.sans,padding:"6px 8px",minHeight:36}}>가이드</button>}
      </div>

      {stt.isListening && (
        <div style={{padding:"10px 16px",background:"#FEF2F2",borderBottom:"1px solid #FECACA",display:"flex",alignItems:"center",gap:10,fontFamily:T.sans,flexShrink:0}}>
          <span style={{width:10,height:10,borderRadius:"50%",background:"#DC2626",animation:"pulse 1s infinite"}}/>
          <span style={{fontSize:13,color:"#991B1B"}}>음성 인식 중...</span>
          {stt.transcript && <span style={{fontSize:12,color:T.sub,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{stt.transcript}"</span>}
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",padding:"24px 16px"}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            <p style={{fontSize:11,color:T.mute,fontFamily:T.sans,letterSpacing:3,marginBottom:6}}>CHAPTER</p>
            <h2 style={{fontSize:"clamp(1.2rem,5vw,1.4rem)",fontWeight:400}}>{ch.title}</h2>
            <div style={{width:32,height:1,background:T.accent,margin:"12px auto 0",opacity:.6}}/>
          </div>

          {guide && (
            <div style={{background:T.accentBg,border:`1px solid ${T.accentBd}`,borderRadius:10,padding:"14px 16px",marginBottom:20,position:"relative"}}>
              <button onClick={() => setGuide(false)} style={{position:"absolute",top:8,right:10,background:"none",border:"none",fontSize:16,color:T.mute,cursor:"pointer",minWidth:32,minHeight:32}}>×</button>
              <p style={{fontSize:14,color:T.accent,lineHeight:1.8,fontFamily:T.sans}}>이 주제에 대한 기억과 이야기를 자유롭게 적어주세요.</p>
            </div>
          )}

          {(ch.photos || []).map(p => (
            <div key={p.id} style={{background:T.card,borderRadius:T.r,overflow:"hidden",border:`1px solid ${T.bdL}`,marginBottom:16,boxShadow:T.sh}}>
              <div style={{position:"relative"}}>
                <img src={p.url} alt="" style={{width:"100%",display:"block",maxHeight:280,objectFit:"cover"}}/>
                <button onClick={() => upd(c=>({...c,photos:c.photos.filter(x=>x.id!==p.id)}))} style={{position:"absolute",top:8,right:8,width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,.4)",color:"#fff",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>×</button>
              </div>
              <input value={p.caption} onChange={e => upd(c=>({...c,photos:c.photos.map(x=>x.id===p.id?{...x,caption:e.target.value}:x)}))} placeholder="사진 설명..." style={{width:"100%",padding:"12px 14px",border:"none",borderTop:`1px solid ${T.bdL}`,fontSize:14,fontFamily:T.sans,outline:"none",color:T.sub}}/>
            </div>
          ))}

          <textarea value={ch.prose ?? initial} onChange={onChange} placeholder="여기에 자유롭게 이야기를 적어주세요..." style={{width:"100%",minHeight:350,border:"none",outline:"none",resize:"none",fontSize:S.prose,lineHeight:S.lh,color:T.tx,fontFamily:T.serif,background:"transparent",caretColor:T.accent}}/>
        </div>
      </div>
    </div>
  );
}

/* ═══════ BOOK VIEWER ═══════ */
function BookPage({ chs, title, author, onBack, S }) {
  const getText = (c) => c.prose?.length > 0 ? c.prose : (c.msgs?.filter(m=>m.type==="user").map(m=>m.text).join("\n\n") || "");
  const getPhotos = (c) => [...(c.msgs||[]).filter(m=>m.type==="photo"&&m.url).map(m=>({url:m.url,cap:""})), ...(c.photos||[]).map(p=>({url:p.url,cap:p.caption}))];
  const wc = chs.filter(c => getText(c).length > 0 || getPhotos(c).length > 0);

  return (
    <div style={{minHeight:"100dvh",background:T.bg}}>
      <div style={{position:"sticky",top:0,zIndex:10,background:"rgba(250,250,248,.95)",backdropFilter:"blur(12px)",padding:"10px 16px",borderBottom:`1px solid ${T.bdL}`,display:"flex",alignItems:"center",minHeight:48}}>
        <button onClick={onBack} style={{background:"none",border:"none",fontSize:14,color:T.sub,cursor:"pointer",fontFamily:T.sans,minHeight:44,display:"flex",alignItems:"center"}}>← 편집</button>
        <span style={{flex:1,textAlign:"center",fontSize:14,fontWeight:500}}>{title}</span>
        <span style={{fontSize:12,color:T.mute,fontFamily:T.sans,minWidth:28,textAlign:"right"}}>{wc.length}장</span>
      </div>

      <div style={{padding:"clamp(48px,12vw,80px) 20px",textAlign:"center",background:`linear-gradient(180deg,${T.dark},#2C2824)`,color:"#FAFAF9"}}>
        <div style={{width:48,height:1,background:"#FAFAF9",margin:"0 auto 28px",opacity:.25}}/>
        <h1 style={{fontSize:"clamp(1.6rem,6vw,2.2rem)",fontWeight:300,letterSpacing:"-0.02em",marginBottom:10}}>{title}</h1>
        <p style={{fontSize:15,opacity:.6,fontWeight:300}}>{author || "저자"}</p>
        <p style={{fontSize:11,opacity:.3,marginTop:20,fontFamily:T.sans,letterSpacing:3}}>나의이야기 · {new Date().getFullYear()}</p>
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"36px 20px 20px"}}>
        <p style={{fontSize:11,color:T.mute,letterSpacing:4,textAlign:"center",fontFamily:T.sans,marginBottom:24}}>TABLE OF CONTENTS</p>
        {chs.map((c, i) => (
          <div key={c.id} style={{display:"flex",alignItems:"baseline",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.bdL}`}}>
            <span style={{fontSize:12,color:T.mute,fontFamily:T.sans,minWidth:26}}>{String(i+1).padStart(2,"0")}</span>
            <span style={{flex:1,fontSize:15}}>{c.title}</span>
          </div>
        ))}
        <div style={{width:32,height:1,background:T.bd,margin:"32px auto"}}/>
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"0 20px 80px"}}>
        {wc.map((c, i) => {
          const t = getText(c);
          const photos = getPhotos(c);
          return (
            <div key={c.id} style={{marginBottom:56}}>
              <div style={{textAlign:"center",marginBottom:32}}>
                <p style={{fontSize:11,color:T.mute,fontFamily:T.sans,letterSpacing:3}}>CHAPTER {String(i+1).padStart(2,"0")}</p>
                <h2 style={{fontSize:"clamp(1.2rem,5vw,1.5rem)",fontWeight:400,marginTop:8}}>{c.title}</h2>
                <div style={{width:32,height:1,background:T.accent,margin:"14px auto 0",opacity:.5}}/>
              </div>
              {photos.map((p, j) => (
                <div key={j} style={{margin:"24px 0",textAlign:"center"}}>
                  <img src={p.url} alt="" style={{maxWidth:"100%",borderRadius:6,boxShadow:T.shL}}/>
                  {p.cap && <p style={{fontSize:12,color:T.mute,marginTop:8,fontFamily:T.sans}}>{p.cap}</p>}
                </div>
              ))}
              {t.split("\n\n").filter(Boolean).map((p, j) => (
                <p key={j} style={{fontSize:S.book,lineHeight:S.lh,color:T.tx,marginBottom:14,fontWeight:300}}>{p}</p>
              ))}
              {i < wc.length - 1 && <div style={{textAlign:"center",padding:"28px 0",color:T.light,letterSpacing:12,fontSize:12}}>· · ·</div>}
            </div>
          );
        })}
        {wc.length === 0 && <p style={{textAlign:"center",color:T.mute,marginTop:60,fontFamily:T.sans}}>아직 작성된 이야기가 없습니다</p>}
      </div>
    </div>
  );
}
