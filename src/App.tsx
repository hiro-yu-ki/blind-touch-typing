import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, BarChart3, BookOpen, BrainCircuit, Check, ChevronRight, Clock3, Focus, Gauge, History, Keyboard, Layers3, Milestone, Pause, Play, RotateCcw, Settings, Sparkles, Target, Volume2, VolumeX } from 'lucide-react'
import { genreOptions, lessons, type Difficulty, type Genre, type Lesson } from './data'
import { calculateAccuracy, calculateScore, commonPrefixLength, evaluateRoman } from './typing'

type Page = 'home' | 'select' | 'practice' | 'result' | 'history'
type InputMode = 'practical' | 'roman'
type SessionType = 'practice' | 'game'
type AppSettings = { sound: boolean; reducedMotion: boolean; fingerGuide: boolean; focusMode: boolean }
type RecordItem = {
  id: string; lessonId: string; title: string; date: string; mode: InputMode; sessionType: SessionType
  seconds: number; characters: number; keys: number; corrections: number; accuracy: number; score: number; completed: boolean; mistakes?: string[]
}

const STORAGE_KEY = 'shigoto-type-history-v1'
const SETTINGS_KEY = 'shigoto-type-settings-v1'

const keyboardRows = [
  ['半角', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '^', '¥', 'Backspace'],
  ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '@', '[', 'Enter'],
  ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', ':', ']', 'Enter'],
  ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', '_', 'Shift'],
  ['Ctrl', 'Alt', '無変換', 'Space', '変換', 'かな', 'Alt', 'Ctrl'],
]

const fingerClass: Record<string, string> = {
  Q: 'lp', A: 'lp', Z: 'lp', '1': 'lp', W: 'lr', S: 'lr', X: 'lr', '2': 'lr', E: 'lm', D: 'lm', C: 'lm', '3': 'lm',
  R: 'li', F: 'li', V: 'li', T: 'li', G: 'li', B: 'li', '4': 'li', '5': 'li', Y: 'ri', H: 'ri', N: 'ri', U: 'ri', J: 'ri', M: 'ri', '6': 'ri', '7': 'ri',
  I: 'rm', K: 'rm', ',': 'rm', '8': 'rm', O: 'rr', L: 'rr', '.': 'rr', '9': 'rr', P: 'rp', ';': 'rp', ':': 'rp', '/': 'rp', '0': 'rp', '-': 'rp', '^': 'rp', '@': 'rp', '[': 'rp', ']': 'rp',
}

const keyLabel = (key: string) => key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key
const visibleCharacter = (character?: string) => character === '\n' ? '↵ 改行' : character === ' ' ? '␠ 空白' : character || '（文字なし）'
const promptSectionPattern = /【([^】]+)】/g

function getPromptSections(text: string) {
  return [...text.matchAll(promptSectionPattern)].map((match) => ({ label: match[1], start: match.index ?? 0 }))
}

function loadRecords(): RecordItem[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function loadSettings(): AppSettings {
  try { return { sound: true, reducedMotion: false, fingerGuide: true, focusMode: false, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') } } catch { return { sound: true, reducedMotion: false, fingerGuide: true, focusMode: false } }
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const [selected, setSelected] = useState<Lesson>(lessons[0])
  const [mode, setMode] = useState<InputMode>('practical')
  const [sessionType, setSessionType] = useState<SessionType>('practice')
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [records, setRecords] = useState<RecordItem[]>(loadRecords)
  const [lastRecord, setLastRecord] = useState<RecordItem | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty | 'すべて'>('すべて')
  const [genre, setGenre] = useState<Genre | 'すべて'>('すべて')

  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) }, [settings])
  const navigate = (next: Page) => { window.scrollTo({ top: 0, behavior: settings.reducedMotion ? 'auto' : 'smooth' }); setPage(next) }
  const start = (lesson = selected, nextMode = mode, nextSession = sessionType) => { setSelected(lesson); setMode(nextMode); setSessionType(nextSession); navigate('practice') }
  const saveRecord = (record: RecordItem) => {
    const next = [record, ...records].slice(0, 50)
    setRecords(next); setLastRecord(record); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setPage('result')
  }

  return <div className={`${settings.reducedMotion ? 'reduce-motion' : ''} ${settings.focusMode ? 'focus-mode' : ''}`}>
    <div className="ambient" />
    {page !== 'practice' && <Header page={page} navigate={navigate} />}
    <main>
      {page === 'home' && <Home records={records} start={start} openSelect={() => navigate('select')} openHistory={() => navigate('history')} />}
      {page === 'select' && <LessonSelect difficulty={difficulty} genre={genre} setDifficulty={setDifficulty} setGenre={setGenre} start={start} mode={mode} setMode={setMode} sessionType={sessionType} setSessionType={setSessionType} />}
      {page === 'practice' && <Practice key={`${selected.id}-${mode}-${sessionType}`} lesson={selected} mode={mode} sessionType={sessionType} settings={settings} setSettings={setSettings} onExit={() => navigate('select')} onFinish={saveRecord} />}
      {page === 'result' && lastRecord && <Result record={lastRecord} previous={records.find((item) => item.lessonId === lastRecord.lessonId && item.id !== lastRecord.id)} retry={() => start(selected, mode, sessionType)} select={() => navigate('select')} />}
      {page === 'history' && <HistorySettings records={records} settings={settings} setSettings={setSettings} clearHistory={() => { setRecords([]); localStorage.removeItem(STORAGE_KEY) }} />}
    </main>
    {page !== 'practice' && <footer>仕事打 <span>— 長文を、落ち着いて正確に。</span></footer>}
  </div>
}

function Header({ page, navigate }: { page: Page; navigate: (page: Page) => void }) {
  return <header className="topbar">
    <button className="brand" onClick={() => navigate('home')} aria-label="ホームへ"><span className="brand-mark"><Keyboard size={21} /></span><span>仕事打<small>SHIGOTO TYPE</small></span></button>
    <nav aria-label="メインナビゲーション">
      <button className={page === 'select' ? 'active' : ''} onClick={() => navigate('select')}><BookOpen size={17} />課題を選ぶ</button>
      <button className={page === 'history' ? 'active' : ''} onClick={() => navigate('history')}><History size={17} />履歴・設定</button>
    </nav>
  </header>
}

function Home({ records, start, openSelect, openHistory }: { records: RecordItem[]; start: (lesson?: Lesson, mode?: InputMode, type?: SessionType) => void; openSelect: () => void; openHistory: () => void }) {
  const latest = records[0]
  const latestCpm = latest ? Math.max(1, Math.round(latest.characters / latest.seconds * 60)) : 1
  const accuracyFirst = !latest || latest.accuracy < 95
  const stages = [
    { name: '基礎', detail: 'F・Jと担当指', reached: !latest || latestCpm < 30 },
    { name: '正確性', detail: '95%を安定', reached: !!latest && latestCpm >= 30 && latest.accuracy < 95 },
    { name: '実務', detail: '文脈を保って入力', reached: !!latest && latestCpm >= 30 && latest.accuracy >= 95 && latestCpm < 160 },
    { name: 'AI・開発', detail: '1000字超の仕様', reached: !!latest && latest.accuracy >= 95 && latestCpm >= 160 },
  ]
  const currentStage = Math.max(0, stages.findIndex((stage) => stage.reached))
  return <>
    <section className="hero page-shell">
      <div className="eyebrow"><span /> BUSINESS WRITING TRAINER</div>
      <h1>仕事で使う文章が、<br /><em>指になじんでいく。</em></h1>
      <p>メール、議事録、報告書。実務に近い長文で、<br className="desktop-only" />正確で迷いのないタッチタイピングを身につけましょう。</p>
      <div className="hero-actions">
        <button className="primary large" onClick={() => start(lessons[0], 'practical', 'practice')}><Play size={18} fill="currentColor" />時間制限なしで始める</button>
        <button className="secondary large" onClick={openSelect}>課題を選ぶ<ChevronRight size={18} /></button>
      </div>
      <div className="hero-note"><span className="keycap">F</span><span className="keycap">J</span>ホームポジションから、ゆっくり始められます</div>
    </section>
    <section className="dashboard page-shell" aria-label="学習概要">
      <article className="continue-card">
        <div className="section-label"><Sparkles size={15} /> TODAY'S FOCUS</div>
        <h2>{latest ? '前回の続きから整える' : 'まずは確認メールから'}</h2>
        <p>{latest ? `${latest.title}では正確率${latest.accuracy}%でした。もう一度、落ち着いて取り組みましょう。` : '短めの文面で、IMEを使った実務入力に慣れましょう。時間制限はありません。'}</p>
        <button className="text-button" onClick={() => start(latest ? lessons.find((l) => l.id === latest.lessonId) ?? lessons[0] : lessons[0], 'practical', 'practice')}>この課題を始める<ChevronRight size={16} /></button>
      </article>
      <div className="stat-grid">
        <button className="stat-card" onClick={openHistory}><span>練習回数</span><strong>{records.length}<small> 回</small></strong><History size={20} /></button>
        <div className="stat-card"><span>最高正確率</span><strong>{records.length ? Math.max(...records.map((r) => r.accuracy)) : '—'}<small>{records.length ? '%' : ''}</small></strong><Gauge size={20} /></div>
        <div className="stat-card"><span>総入力文字</span><strong>{records.reduce((sum, r) => sum + r.characters, 0).toLocaleString()}<small> 字</small></strong><BarChart3 size={20} /></div>
      </div>
    </section>
    <section className="coach page-shell">
      <div className="coach-copy"><div className="section-label"><BrainCircuit size={15} /> PERSONAL PRACTICE COACH</div><h2>{latest ? `次の目標は ${Math.ceil(latestCpm * 1.1)} 文字/分` : '1文字/分からで、大丈夫です。'}</h2><p>{accuracyFirst ? '速度を追わず、まず見本と同じ文字を落ち着いて打ちます。正確率95%を二回続けたら、今の速度より10%だけ上を目指しましょう。' : '正確さが安定しています。短い速度練習と長文練習を交互に行い、文脈を読みながら同じ指運びを再現しましょう。'} 300文字/分は最終目安の一例で、最初の基準ではありません。</p><div className="coach-rule"><Target /> 毎日5〜10分・正確率95%を優先・前回比+10%まで</div></div>
      <div className="skill-path">{stages.map((stage, index) => <div key={stage.name} className={index === currentStage ? 'current-stage' : index < currentStage ? 'passed-stage' : ''}><span>{index < currentStage ? <Check /> : index + 1}</span><strong>{stage.name}</strong><small>{stage.detail}</small></div>)}</div>
    </section>
    <section className="features page-shell">
      <div><span>01</span><h3>実務そのままの長文</h3><p>文脈のある15本のオリジナル文書。IME変換中は判定を待ちます。</p></div>
      <div><span>02</span><h3>指まで見えるキーボード</h3><p>物理キーと指の担当を画面上で確認。実務入力では候補を推測しません。</p></div>
      <div><span>03</span><h3>数字で振り返る</h3><p>日本語文字数、打鍵数、正確率を分けて記録し、前回との差を表示します。</p></div>
      <div><span>04</span><h3>プロンプトを構造で覚える</h3><p>役割・要件・制約・評価を区切り、1000字超の開発指示を攻略します。</p></div>
    </section>
  </>
}

function LessonSelect({ difficulty, genre, setDifficulty, setGenre, start, mode, setMode, sessionType, setSessionType }: {
  difficulty: Difficulty | 'すべて'; genre: Genre | 'すべて'; setDifficulty: (value: Difficulty | 'すべて') => void; setGenre: (value: Genre | 'すべて') => void
  start: (lesson: Lesson, mode: InputMode, type: SessionType) => void; mode: InputMode; setMode: (value: InputMode) => void; sessionType: SessionType; setSessionType: (value: SessionType) => void
}) {
  const filtered = lessons.filter((lesson) => (difficulty === 'すべて' || lesson.difficulty === difficulty) && (genre === 'すべて' || lesson.genre === genre))
  return <section className="page-shell inner-page">
    <div className="page-heading"><div><div className="eyebrow"><span /> LESSON LIBRARY</div><h1>今日の一文を選ぶ</h1><p>目的と気分に合わせて、無理のない課題から。</p></div><div className="count-seal"><strong>{filtered.length}</strong><span>LESSONS</span></div></div>
    <div className="mode-panel">
      <fieldset><legend>入力方式</legend><Segmented options={[['practical', '実務入力', 'IMEで完成文を入力'], ['roman', 'ローマ字', '読みをキーで練習']]} value={mode} setValue={(value) => setMode(value as InputMode)} /></fieldset>
      <fieldset><legend>練習スタイル</legend><Segmented options={[['practice', '練習', '時間制限なし'], ['game', 'チャレンジ', '90秒で得点']]} value={sessionType} setValue={(value) => setSessionType(value as SessionType)} /></fieldset>
    </div>
    <div className="filters">
      <label>難易度<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty | 'すべて')}><option>すべて</option><option>初級</option><option>中級</option><option>上級</option></select></label>
      <label>文書の種類<select value={genre} onChange={(event) => setGenre(event.target.value as Genre | 'すべて')}><option>すべて</option>{genreOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
    </div>
    <div className="lesson-grid">
      {filtered.map((lesson, index) => <article className="lesson-card" key={lesson.id}>
        <div className="lesson-top"><span className={`level ${lesson.difficulty}`}>{lesson.difficulty}</span><span>{lesson.genre}</span><span><Clock3 size={14} />約{lesson.minutes}分</span></div>
        <div className="lesson-number">{String(index + 1).padStart(2, '0')}</div>
        <h2>{lesson.title}</h2><p>{lesson.text.replaceAll('\n', '').slice(0, 82)}…</p>
        {mode === 'roman' ? <div className="excerpt">練習範囲：{lesson.romanExcerpt}</div> : <div className={`excerpt ${lesson.text.length >= 1000 ? 'long-form' : ''}`}>{lesson.text.length.toLocaleString()}文字 {lesson.text.length >= 1000 && '· 長文チェックポイント対応'}</div>}
        <button className="card-action" onClick={() => start(lesson, mode, sessionType)}>この課題を始める<ChevronRight size={17} /></button>
      </article>)}
    </div>
  </section>
}

function Segmented({ options, value, setValue }: { options: string[][]; value: string; setValue: (value: string) => void }) {
  return <div className="segmented">{options.map(([key, label, detail]) => <button className={value === key ? 'selected' : ''} onClick={() => setValue(key)} key={key}><span>{label}{value === key && <Check size={14} />}</span><small>{detail}</small></button>)}</div>
}

function Practice({ lesson, mode, sessionType, settings, setSettings, onExit, onFinish }: {
  lesson: Lesson; mode: InputMode; sessionType: SessionType; settings: AppSettings; setSettings: (settings: AppSettings) => void; onExit: () => void; onFinish: (record: RecordItem) => void
}) {
  const [status, setStatus] = useState<'ready' | 'running' | 'paused'>('ready')
  const [draft, setDraft] = useState('')
  const [committed, setCommitted] = useState('')
  const [romanInput, setRomanInput] = useState('')
  const [composing, setComposing] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [keys, setKeys] = useState(0)
  const [corrections, setCorrections] = useState(0)
  const [misses, setMisses] = useState(0)
  const [pasteChars, setPasteChars] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [mistakes, setMistakes] = useState<string[]>([])
  const [pressedKey, setPressedKey] = useState('')
  const [wrongKey, setWrongKey] = useState('')
  const [notice, setNotice] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const romanRef = useRef<HTMLInputElement>(null)
  const currentCharacterRef = useRef<HTMLSpanElement>(null)
  const focusInput = () => (mode === 'practical' ? textareaRef.current : romanRef.current)?.focus()
  const startedAt = useRef(0)
  const target = mode === 'practical' ? lesson.text : lesson.reading
  const romanEval = useMemo(() => evaluateRoman(romanInput, lesson.reading), [romanInput, lesson.reading])
  const progress = mode === 'practical' ? commonPrefixLength(committed, lesson.text) : romanEval.complete ? lesson.reading.length : Math.min(lesson.reading.length, Math.round((romanInput.length / Math.max(romanEval.canonical.length, 1)) * lesson.reading.length))
  const remaining = sessionType === 'game' ? Math.max(0, 90 - seconds) : null
  const promptSections = useMemo(() => mode === 'practical' ? getPromptSections(lesson.text) : [], [lesson.text, mode])
  const currentSection = promptSections.reduce((active, section, index) => progress >= section.start ? index : active, 0)
  const checkpointSize = lesson.text.length >= 1000 ? 250 : lesson.text.length
  const checkpoint = Math.min(Math.floor(progress / checkpointSize) + 1, Math.ceil(lesson.text.length / checkpointSize))
  const checkpointTotal = Math.ceil(lesson.text.length / checkpointSize)
  const hasMismatch = mode === 'practical' && !composing && committed.length > progress
  const expectedCharacter = hasMismatch ? lesson.text[progress] : ''
  const actualCharacter = hasMismatch ? committed[progress] : ''

  useEffect(() => {
    if (status !== 'running') return
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt.current) / 1000)), 250)
    return () => clearInterval(timer)
  }, [status])
  useEffect(() => { if (status === 'running' && remaining === 0) finish(false) }, [remaining, status])
  useEffect(() => { if (status === 'running') focusInput() }, [status])
  useEffect(() => { currentCharacterRef.current?.scrollIntoView({ block: 'center', behavior: settings.reducedMotion ? 'auto' : 'smooth' }) }, [progress, settings.reducedMotion])

  const beep = (frequency: number, duration = .04) => {
    if (!settings.sound) return
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass(); const oscillator = context.createOscillator(); const gain = context.createGain()
    oscillator.frequency.value = frequency; gain.gain.value = .025; oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration)
  }
  const begin = () => { startedAt.current = Date.now() - seconds * 1000; setStatus('running'); window.setTimeout(focusInput, 30) }
  const togglePause = () => {
    if (status === 'running') { setStatus('paused') } else { startedAt.current = Date.now() - seconds * 1000; setStatus('running') }
  }
  const reset = () => { setStatus('ready'); setDraft(''); setCommitted(''); setRomanInput(''); setSeconds(0); setKeys(0); setCorrections(0); setMisses(0); setPasteChars(0); setCombo(0); setBestCombo(0); setMistakes([]); setNotice('') }
  const finish = (completed: boolean, finalCharacterCount?: number) => {
    const characterCount = finalCharacterCount ?? (mode === 'practical' ? Math.max(0, committed.length - pasteChars) : completed ? lesson.reading.length : progress)
    const accuracy = calculateAccuracy(characterCount, corrections, misses)
    const record: RecordItem = { id: `${Date.now()}-${lesson.id}`, lessonId: lesson.id, title: lesson.title, date: new Date().toISOString(), mode, sessionType, seconds: Math.max(seconds, 1), characters: characterCount, keys, corrections, accuracy, score: sessionType === 'game' ? calculateScore(characterCount, accuracy, Math.max(seconds, 1), bestCombo) : 0, completed, mistakes }
    onFinish(record)
  }
  const flashKey = (key: string, wrong = false) => {
    const label = keyLabel(key); setPressedKey(label); if (wrong) setWrongKey(label)
    window.setTimeout(() => { setPressedKey(''); if (wrong) setWrongKey('') }, 180)
  }
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (status !== 'running') return
    if (event.key === 'Escape') { event.preventDefault(); togglePause(); return }
    if (event.ctrlKey || event.metaKey || event.altKey || ['Shift', 'CapsLock', 'Tab'].includes(event.key)) return
    flashKey(event.key)
    if (!event.nativeEvent.isComposing && (event.key.length === 1 || ['Backspace', 'Delete', 'Enter'].includes(event.key))) setKeys((value) => value + 1)
    if (['Backspace', 'Delete'].includes(event.key)) { setCorrections((value) => value + 1); setCombo(0) }
  }
  const updatePractical = (value: string, commitComposition = false) => {
    setDraft(value)
    if (composing && !commitComposition) return
    const oldPrefix = commonPrefixLength(committed, lesson.text); const nextPrefix = commonPrefixLength(value, lesson.text)
    if (nextPrefix > oldPrefix) { const nextCombo = combo + (nextPrefix - oldPrefix); setCombo(nextCombo); setBestCombo((best) => Math.max(best, nextCombo)); beep(520) }
    const previouslyWrong = committed.length > oldPrefix
    if (value.length > nextPrefix && value !== committed && !previouslyWrong) {
      const pair = `${visibleCharacter(lesson.text[nextPrefix])} → ${visibleCharacter(value[nextPrefix])}`
      setMisses((count) => count + 1); setMistakes((items) => [...items, pair]); setCombo(0); beep(160, .06)
    }
    setCommitted(value)
    if (value === lesson.text) window.setTimeout(() => finish(true, Math.max(0, value.length - pasteChars)), 80)
  }
  const updateRoman = (value: string) => {
    const evaluation = evaluateRoman(value.toLowerCase(), lesson.reading)
    if (!evaluation.valid) { const last = value.slice(-1); flashKey(last, true); setMisses((count) => count + 1); setMistakes((items) => [...items, `${romanEval.next.join(' / ') || '完了'} → ${last}`]); setCombo(0); beep(150, .06); return }
    setRomanInput(value.toLowerCase()); const nextCombo = combo + Math.max(0, value.length - romanInput.length); setCombo(nextCombo); setBestCombo((best) => Math.max(best, nextCombo)); beep(540)
    if (evaluation.complete) window.setTimeout(() => finish(true), 80)
  }
  const expectedKeys = mode === 'roman' ? romanEval.next.map(keyLabel) : []
  const focusMismatch = () => { textareaRef.current?.focus(); textareaRef.current?.setSelectionRange(progress, Math.min(progress + 1, committed.length)) }

  return <section className="practice-page">
    <header className="practice-bar">
      <button className="icon-button" onClick={onExit} aria-label="課題選択へ戻る"><ArrowLeft /></button>
      <div><span className="practice-kicker">{mode === 'practical' ? '実務入力' : 'ローマ字練習'} · {sessionType === 'game' ? '90秒チャレンジ' : '時間制限なし'}</span><strong>{lesson.title}</strong></div>
      <div className="practice-status"><span><Clock3 />{remaining !== null ? `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}` : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`}</span><span>{Math.round(progress / target.length * 100)}%</span></div>
      <div className="practice-tools"><button className="icon-button" onClick={() => setSettings({ ...settings, sound: !settings.sound })} aria-label={settings.sound ? '音をオフ' : '音をオン'}>{settings.sound ? <Volume2 /> : <VolumeX />}</button><button className="icon-button" onClick={togglePause} disabled={status === 'ready'} aria-label="一時停止または再開">{status === 'paused' ? <Play /> : <Pause />}</button><button className="icon-button" onClick={reset} aria-label="やり直す"><RotateCcw /></button></div>
    </header>
    <div className="progress-track"><span style={{ width: `${progress / target.length * 100}%` }} /></div>
    <div className="practice-content">
      <div className="document-panel">
        <div className="document-meta"><span>{lesson.genre}</span><span>{lesson.difficulty}</span><span>{mode === 'practical' ? `${lesson.text.length}文字` : `${lesson.reading.length}文字の読み`}</span>{lesson.text.length >= 1000 && mode === 'practical' && <span className="checkpoint-label"><Milestone />区間 {checkpoint}/{checkpointTotal}</span>}</div>
        {promptSections.length > 0 && <div className="prompt-map" aria-label="プロンプト構造"><Layers3 />{promptSections.map((section, index) => <span key={`${section.label}-${section.start}`} className={index < currentSection ? 'done' : index === currentSection ? 'active' : ''}>{index < currentSection && <Check />}{section.label}</span>)}</div>}
        <div className="sample-text" aria-label="入力する見本文">
          {(mode === 'practical' ? lesson.text : lesson.romanExcerpt).split('').map((character, index) => {
            const done = index < progress; const current = index === progress
            return <span ref={current ? currentCharacterRef : undefined} key={index} className={done ? 'typed' : current ? 'current' : ''}>{character}</span>
          })}
        </div>
        {mode === 'roman' && <div className="reading-line"><span>よみ</span>{lesson.reading}<small>入力例：{romanEval.canonical}</small></div>}
      </div>
      <div className="input-panel">
        <div className={`input-label ${hasMismatch ? 'has-error' : ''}`}><span>{composing ? '変換中 — 確定を待っています' : hasMismatch ? `最初のズレ：${progress + 1}文字目` : status === 'running' ? '見本と一致しています' : '準備ができたら開始してください'}</span><span>{notice}</span></div>
        {mode === 'practical' ? <textarea aria-invalid={hasMismatch} ref={textareaRef} value={draft} disabled={status !== 'running'} onKeyDown={handleKeyDown} onCompositionStart={() => setComposing(true)} onCompositionEnd={(event) => { setComposing(false); const value = event.currentTarget.value; window.setTimeout(() => updatePractical(value, true), 0) }} onChange={(event) => updatePractical(event.target.value)} onPaste={(event) => { const length = event.clipboardData.getData('text').length; setPasteChars((value) => value + length); setNotice(`貼り付けた${length}文字は成績対象外`); window.setTimeout(() => setNotice(''), 2500) }} spellCheck={false} aria-label="実務入力欄" placeholder="ここに見本どおり入力します。IME変換中は判定されません。" /> : <input ref={romanRef} value={romanInput} disabled={status !== 'running'} onKeyDown={handleKeyDown} onChange={(event) => updateRoman(event.target.value)} onPaste={(event) => { event.preventDefault(); setNotice('ローマ字練習では貼り付けできません'); }} autoCapitalize="off" autoComplete="off" spellCheck={false} aria-label="ローマ字入力欄" placeholder="ローマ字を入力" />}
        {hasMismatch && <div className="error-coach" role="alert"><AlertTriangle /><div><strong>{progress + 1}文字目を確認</strong><span>見本 <b>{visibleCharacter(expectedCharacter)}</b> ／ 入力 <b>{visibleCharacter(actualCharacter)}</b></span><small>ここを直すと、その先の判定が再開します。</small></div><button onClick={focusMismatch}>入力位置へ</button></div>}
        {status !== 'running' && <div className="start-overlay"><div className="start-icon"><Focus /></div><h2>{status === 'paused' ? '一時停止中' : '姿勢を整えて、始めましょう'}</h2><p>{mode === 'practical' ? '日本語入力をオンにし、文面をそのまま入力します。' : '日本語入力をオフにし、半角英字で入力します。'}</p><button className="primary large" onClick={begin}><Play size={18} fill="currentColor" />{status === 'paused' ? '再開する' : 'スタート'}</button><small>Esc キーでも一時停止できます</small></div>}
      </div>
    </div>
    <VirtualKeyboard pressed={pressedKey} wrong={wrongKey} expected={expectedKeys} fingerGuide={settings.fingerGuide} />
    <div className="practice-footer"><label><input type="checkbox" checked={settings.fingerGuide} onChange={(event) => setSettings({ ...settings, fingerGuide: event.target.checked })} /> 指の担当色を表示</label><span>{mode === 'practical' ? 'IME入力では次キーを予測せず、押した物理キーを表示します' : '黄色：次に入力できるキー　赤：誤打キー'}</span><button className="quiet-button" onClick={() => setSettings({ ...settings, focusMode: !settings.focusMode })}>集中表示 {settings.focusMode ? 'ON' : 'OFF'}</button></div>
  </section>
}

function VirtualKeyboard({ pressed, wrong, expected, fingerGuide }: { pressed: string; wrong: string; expected: string[]; fingerGuide: boolean }) {
  return <div className={`keyboard-wrap ${fingerGuide ? 'show-fingers' : ''}`} aria-label="日本語JIS配列を基本にしたキーボード表示">
    <div className="keyboard-legend"><span><i className="expected-dot" />次の候補</span><span><i className="pressed-dot" />押したキー</span><span><i className="wrong-dot" />誤打</span></div>
    <div className="keyboard-ui">{keyboardRows.map((row, rowIndex) => <div className="keyboard-row" key={rowIndex}>{row.map((key, index) => <div key={`${key}-${index}`} className={`keyboard-key ${key.length > 2 ? 'wide' : ''} ${key === 'Space' ? 'space' : ''} ${fingerClass[key] ?? ''} ${pressed === key ? 'pressed' : ''} ${wrong === key ? 'wrong' : ''} ${expected.includes(key) ? 'expected' : ''} ${['F', 'J'].includes(key) ? 'home-key' : ''}`}><span>{key}</span></div>)}</div>)}</div>
    {fingerGuide && <div className="finger-guide"><span className="lp">左小指</span><span className="lr">薬指</span><span className="lm">中指</span><span className="li">人差指</span><span className="thumb">親指</span><span className="ri">人差指</span><span className="rm">中指</span><span className="rr">薬指</span><span className="rp">右小指</span></div>}
  </div>
}

function Result({ record, previous, retry, select }: { record: RecordItem; previous?: RecordItem; retry: () => void; select: () => void }) {
  const charsPerMinute = Math.round(record.characters / record.seconds * 60)
  const kpm = Math.round(record.keys / record.seconds * 60)
  const delta = previous ? Math.round((record.accuracy - previous.accuracy) * 10) / 10 : null
  const nextTarget = Math.max(1, Math.ceil(charsPerMinute * (record.accuracy >= 95 ? 1.1 : 1)))
  const uniqueMistakes = [...new Set(record.mistakes ?? [])].slice(0, 5)
  return <section className="page-shell result-page">
    <div className="result-burst"><Sparkles /><span>{record.completed ? 'COMPLETE' : 'TIME UP'}</span></div>
    <h1>{record.completed ? '丁寧な入力、おつかれさまでした。' : '90秒の挑戦、おつかれさまでした。'}</h1><p>{record.title}</p>
    {record.sessionType === 'game' && <div className="score"><span>SCORE</span><strong>{record.score.toLocaleString()}</strong></div>}
    <div className="result-grid">
      <div><span>自分で入力できた日本語</span><strong>{record.characters}<small> 文字</small></strong><p>貼り付けた文字は除外</p></div>
      <div><span>所要時間</span><strong>{Math.floor(record.seconds / 60)}<small>分</small> {record.seconds % 60}<small>秒</small></strong><p>{record.completed ? '課題完了まで' : '制限時間まで'}</p></div>
      <div className="accent"><span>見本どおりに打てた割合</span><strong>{record.accuracy}<small>%</small></strong><p>{delta === null ? '今回が最初の記録' : `前回比 ${delta >= 0 ? '+' : ''}${delta}ポイント`}</p></div>
      <div><span>日本語の入力ペース</span><strong>{charsPerMinute}<small> 文字/分</small></strong><p>競争ではなく、自分との比較用</p></div>
      <div><span>取得できたキー操作</span><strong>{record.keys}<small> 回</small></strong><p>目安：{kpm}回/分（IME内は除く）</p></div>
      <div><span>直すために押した回数</span><strong>{record.corrections}<small> 回</small></strong><p>BackspaceとDelete</p></div>
    </div>
    <div className="next-coach"><Target /><div><span>NEXT PRACTICE</span><strong>{record.accuracy < 95 ? '次も同じ速さで、正確率95%を目指す' : `次の目安は ${nextTarget}文字/分。上げ幅は10%だけ`}</strong><p>300文字/分を今すぐ目指す必要はありません。手元を見ないで正しく打てる範囲を少しずつ広げます。</p></div></div>
    {uniqueMistakes.length > 0 && <div className="mistake-review"><strong>今回つまずいた文字</strong><div>{uniqueMistakes.map((item) => <span key={item}>{item}</span>)}</div></div>}
    <div className="metric-note"><strong>数字の意味</strong> 「文字/分」は完成した日本語の数です。「キー操作/分」はブラウザーが取得できた物理キーです。IME内部の打鍵は完全には取得できないため、一般的な英語WPMや他サービスの数字とは直接比較しません。</div>
    <div className="result-actions"><button className="primary large" onClick={retry}><RotateCcw size={18} />もう一度挑戦</button><button className="secondary large" onClick={select}>別の課題を選ぶ</button></div>
  </section>
}

function HistorySettings({ records, settings, setSettings, clearHistory }: { records: RecordItem[]; settings: AppSettings; setSettings: (settings: AppSettings) => void; clearHistory: () => void }) {
  return <section className="page-shell inner-page history-page">
    <div className="page-heading"><div><div className="eyebrow"><span /> YOUR PROGRESS</div><h1>履歴と設定</h1><p>積み重ねを確認し、心地よい練習環境に整えます。</p></div></div>
    <div className="history-layout">
      <div><div className="section-title"><h2>最近の練習</h2><span>{records.length}件を保存中</span></div>{records.length ? <div className="history-list">{records.map((record) => <article key={record.id}><div className={`history-icon ${record.completed ? 'done' : ''}`}>{record.completed ? <Check /> : <Clock3 />}</div><div><strong>{record.title}</strong><span>{new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(record.date))} · {record.mode === 'practical' ? '実務入力' : 'ローマ字'}</span></div><div><strong>{record.accuracy}%</strong><span>{record.characters}文字 / {Math.floor(record.seconds / 60)}分{record.seconds % 60}秒</span></div></article>)}</div> : <div className="empty"><History /><h3>まだ履歴がありません</h3><p>課題を完了すると、ここに記録されます。</p></div>} {records.length > 0 && <button className="danger-text" onClick={() => window.confirm('保存した練習履歴をすべて削除しますか？') && clearHistory()}>履歴をすべて削除</button>}</div>
      <aside className="settings-card"><div className="section-title"><h2><Settings size={20} />表示・操作設定</h2></div><Toggle label="効果音" detail="正しい入力と誤打を短い音で知らせます" checked={settings.sound} onChange={(value) => setSettings({ ...settings, sound: value })} /><Toggle label="指の担当色" detail="キーボードに左右の指の領域を表示します" checked={settings.fingerGuide} onChange={(value) => setSettings({ ...settings, fingerGuide: value })} /><Toggle label="動きを減らす" detail="画面のアニメーションを抑えます" checked={settings.reducedMotion} onChange={(value) => setSettings({ ...settings, reducedMotion: value })} /><Toggle label="集中表示" detail="練習中の補助情報を少なくします" checked={settings.focusMode} onChange={(value) => setSettings({ ...settings, focusMode: value })} /><div className="storage-note">履歴と設定は、このブラウザーの localStorage にのみ保存されます。外部サーバーへ送信しません。</div></aside>
    </div>
  </section>
}

function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="toggle-row"><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>
}

export default App
