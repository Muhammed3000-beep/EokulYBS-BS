import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection, collectionGroup, doc, getCountFromServer, getDoc, getDocs, limit, onSnapshot,
  orderBy, query, serverTimestamp, setDoc, where, writeBatch
} from 'firebase/firestore';
import { auth, db } from './firebase';

const GRADES = [5, 6, 7, 8];
const SECTIONS = 'ABCDEFGHIJKLM'.split('');
const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8];
const TERMS = [1, 2, 3];
const ASSESSMENTS = [1, 2, 3, 4, 5];
const firstNames = ['Ada', 'Ahmet', 'Ali', 'Arda', 'Asel', 'Ayaz', 'Aylin', 'Azra', 'Bartu', 'Beril', 'Berk', 'Buğra', 'Can', 'Ceren', 'Ceylin', 'Defne', 'Deniz', 'Derin', 'Duru', 'Ece', 'Ecrin', 'Efe', 'Ela', 'Elif', 'Emir', 'Emirhan', 'Emre', 'Eren', 'Erva', 'Eslem', 'Eylül', 'Fatma', 'Furkan', 'Gizem', 'Göktuğ', 'Hakan', 'Hamza', 'Hazal', 'Ilgaz', 'İpek', 'Kerem', 'Kuzey', 'Lara', 'Mert', 'Mira', 'Miray', 'Miraç', 'Muhammed', 'Naz', 'Nehir', 'Nisa', 'Oğuz', 'Ömer', 'Öykü', 'Pelin', 'Rüzgar', 'Sarp', 'Selin', 'Sena', 'Sude', 'Talha', 'Tanem', 'Toprak', 'Umut', 'Yağız', 'Yaren', 'Yiğit', 'Zeynep'];
const lastNames = ['Aksoy', 'Arslan', 'Aydın', 'Acar', 'Aslan', 'Avcı', 'Aydoğdu', 'Babacan', 'Bal', 'Başaran', 'Bayram', 'Bulut', 'Can', 'Candan', 'Çakır', 'Çelik', 'Çetin', 'Demir', 'Demirel', 'Doğan', 'Duman', 'Erdoğan', 'Eren', 'Ergin', 'Güler', 'Güneş', 'Gür', 'Işık', 'Kaplan', 'Kara', 'Karaca', 'Kaya', 'Keskin', 'Koç', 'Korkmaz', 'Kurt', 'Kuş', 'Özdemir', 'Özer', 'Polat', 'Sarı', 'Şahin', 'Şen', 'Taş', 'Tekin', 'Türk', 'Uçar', 'Yalçın', 'Yıldırım', 'Yılmaz', 'Yüce'];

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function makeSessionId(date, grade, section, lesson) {
  return `${date}_g${grade}_${section}_l${lesson}`;
}
function makeGradeId(uid, term, type, number) {
  return `${uid}_t${term}_${type}_${number}`;
}
function showDate(value) {
  if (!value) return '—';
  const raw = typeof value === 'string' ? value : value?.toDate ? value.toDate() : null;
  if (!raw) return '—';
  if (typeof raw === 'string') {
    const [y, m, d] = raw.split('-');
    return `${d}.${m}.${y}`;
  }
  return raw.toLocaleDateString('tr-TR');
}
function stampLabel(value) {
  if (!value?.toDate) return '—';
  return value.toDate().toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}
function makeDemoStudents() {
  const out = [];
  const usedNumbers = new Set();
  const usedNames = new Set();
  let idx = 0;
  for (const grade of GRADES) {
    for (const section of SECTIONS) {
      for (let i = 1; i <= 18; i += 1) {
        let num = 10000 + ((idx * 7919 + 173) % 89999);
        while (usedNumbers.has(num)) num = num >= 99999 ? 10000 : num + 1;
        usedNumbers.add(num);
        const a = (idx * 13 + i * 7 + grade * 3) % firstNames.length;
        let b = (idx * 17 + i * 11 + grade) % lastNames.length;
        let fullName = `${firstNames[a]} ${lastNames[b]}`;
        while (usedNames.has(fullName)) {
          b = (b + 1) % lastNames.length;
          fullName = `${firstNames[a]} ${lastNames[b]}`;
        }
        usedNames.add(fullName);
        const id = `g${grade}_${section.toLowerCase()}_${String(i).padStart(2, '0')}`;
        out.push({ id, schoolNumber: num, firstName: firstNames[a], lastName: fullName.split(' ').slice(1).join(' '), fullName, classGrade: grade, section, parentUid: null, demo: true });
        idx += 1;
      }
    }
  }
  return out;
}

function LoginScreen({ onLogin, email, setEmail, password, setPassword, busy, error }) {
  return <div className="auth-shell">
    <div className="auth-art">
      <div className="brand-mark">e<span>·</span>okul</div>
      <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
      <div className="auth-copy">
        <p className="eyebrow light">OKUL YÖNETİM PLATFORMU</p>
        <h1>Düzenli kayıt.<br /><em>Güvenli takip.</em></h1>
        <p>Devamsızlık ve not işlemlerini tek merkezden, veli görünümünü ayrı ve güvenli bir panelden takip edin.</p>
      </div>
      <div className="art-footer"><span className="pulse-dot" /> Firebase bağlantılı demo ortamı</div>
    </div>
    <div className="auth-form-wrap">
      <form className="auth-card" onSubmit={onLogin}>
        <div className="mobile-brand">e<span>·</span>okul</div>
        <p className="eyebrow">HESAP GİRİŞİ</p>
        <h2>Tekrar hoş geldiniz</h2>
        <p className="muted">Firebase Authentication hesabınızla giriş yapın.</p>
        <label className="field-label">E-posta adresi</label>
        <input className="input" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="ornek@okul.edu.tr" required />
        <label className="field-label">Şifre</label>
        <input className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Şifrenizi girin" required />
        {error && <div className="alert error">{error}</div>}
        <button className="button primary full" type="submit" disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'Güvenli giriş yap'} <span>→</span></button>
        <div className="auth-note"><span>🔐</span><span>Hesap oluşturma ve rol atama, Firebase yöneticisi tarafından yapılır.</span></div>
      </form>
    </div>
  </div>;
}

function SetupNotice({ profile, onLogout }) {
  const missing = !profile;
  return <div className="setup-shell">
    <div className="setup-card">
      <div className="setup-icon">⚙️</div>
      <p className="eyebrow">İLK KURULUM</p>
      <h2>{missing ? 'Bu hesap için kullanıcı profili bulunamadı' : 'Bu portalda yetkili değilsiniz'}</h2>
      <p className="muted">{missing ? 'Firebase Console → Firestore Database bölümünde users koleksiyonuna, hesap UID’siyle aynı belgeyi ekleyin. README dosyasındaki örnek belgeyi kullanın.' : 'Bu ZIP yalnızca Öğretmen ve YBS hesapları içindir. VBS hesabıyla diğer ZIP paketinden giriş yapın.'}</p>
      <div className="code-line">{missing ? 'users/{Firebase Authentication UID}' : `Rol: ${profile.role || 'tanımsız'}`}</div>
      <button className="button secondary" onClick={onLogout}>Çıkış yap</button>
    </div>
  </div>;
}

function App() {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [page, setPage] = useState('overview');
  const [notice, setNotice] = useState(null);

  useEffect(() => onAuthStateChanged(auth, async current => {
    setAuthUser(current);
    setProfile(null);
    if (current) {
      try {
        const snap = await getDoc(doc(db, 'users', current.uid));
        if (snap.exists()) setProfile({ ...snap.data(), uid: current.uid });
      } catch (err) {
        setLoginError(`Profil okunamadı: ${err.message}`);
      }
    }
    setAuthLoading(false);
  }), []);

  const login = async e => {
    e.preventDefault();
    setBusy(true); setLoginError('');
    try { await signInWithEmailAndPassword(auth, email.trim(), password); setPassword(''); }
    catch (err) { setLoginError(authErrorText(err)); }
    finally { setBusy(false); }
  };
  const logout = () => signOut(auth);
  const flash = (kind, text) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 6500);
  };

  if (authLoading) return <div className="loading-screen"><div className="loader" /><span>Güvenli oturum kontrol ediliyor…</span></div>;
  if (!authUser) return <LoginScreen onLogin={login} email={email} setEmail={setEmail} password={password} setPassword={setPassword} busy={busy} error={loginError} />;
  if (!profile || !['teacher', 'ybs'].includes(profile.role)) return <SetupNotice profile={profile} onLogout={logout} />;

  const isYbs = profile.role === 'ybs';
  const navItems = isYbs
    ? [{ id: 'overview', icon: '▦', label: 'Genel Bakış' }, { id: 'review', icon: '◷', label: 'Devamsızlık Yönetimi' }, { id: 'link', icon: '♧', label: 'Öğrenci / Veli Bağla' }]
    : [{ id: 'overview', icon: '▦', label: 'Genel Bakış' }, { id: 'attendance', icon: '◷', label: 'Devamsızlık Gir' }, { id: 'grades', icon: '✎', label: 'Not İşlemleri' }];
  const pageTitle = ({ overview: isYbs ? 'Yönetim özeti' : 'Öğretmen paneli', attendance: 'Devamsızlık girişi', grades: 'Not işlemleri', review: 'Devamsızlık yönetimi', link: 'Öğrenci / veli eşleştirme' })[page] || 'E-Okul';

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><div className="brand-icon">e<span>·</span></div><div><strong>e-okul</strong><small>YÖNETİM SİSTEMİ</small></div></div>
      <div className="nav-caption">ÇALIŞMA ALANI</div>
      <nav className="side-nav">
        {navItems.map(item => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{page === item.id && <i />}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="connection"><span className="pulse-dot" /><div><strong>Firebase bağlı</strong><small>Canlı veri bağlantısı</small></div></div>
        <div className="user-mini"><div className="avatar">{(profile.displayName || 'K').slice(0, 1).toLocaleUpperCase('tr-TR')}</div><div className="user-mini-text"><strong>{profile.displayName || 'Kullanıcı'}</strong><small>{isYbs ? 'YBS yöneticisi' : `${profile.subject || 'Branş belirtilmemiş'} öğretmeni`}</small></div><button className="logout-icon" onClick={logout} title="Çıkış yap" aria-label="Çıkış yap">↗</button></div>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div><p className="eyebrow">E-OKUL / {isYbs ? 'YBS' : 'ÖĞRETMEN'}</p><h1>{pageTitle}</h1></div><div className="topbar-right"><span className="today-chip">◷ &nbsp;{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span><div className="avatar top-avatar">{(profile.displayName || 'K').slice(0, 1).toLocaleUpperCase('tr-TR')}</div></div></header>
      {notice && <div className={`toast ${notice.kind}`}>{notice.kind === 'success' ? '✓' : '!' } &nbsp;{notice.text}<button onClick={() => setNotice(null)}>×</button></div>}
      {page === 'overview' && (isYbs ? <YbsDashboard onFlash={flash} /> : <TeacherDashboard profile={profile} onNavigate={setPage} />)}
      {page === 'attendance' && !isYbs && <TeacherAttendance profile={profile} onFlash={flash} />}
      {page === 'grades' && !isYbs && <TeacherGrades profile={profile} onFlash={flash} />}
      {page === 'review' && isYbs && <YbsReview profile={profile} onFlash={flash} />}
      {page === 'link' && isYbs && <StudentLink onFlash={flash} />}
      <footer className="app-footer"><span>e·okul demo sistemi</span><span>Veriler Firestore üzerinde saklanır · Öğrenci adları demo verisidir</span></footer>
    </main>
  </div>;
}

function TeacherDashboard({ profile, onNavigate }) {
  const [studentCount, setStudentCount] = useState(null);
  useEffect(() => {
    getCountFromServer(collection(db, 'students')).then(s => setStudentCount(s.data().count)).catch(() => setStudentCount(null));
  }, []);
  return <div className="content-stack">
    <section className="welcome-banner"><div><p className="eyebrow light">HOŞ GELDİNİZ</p><h2>{profile.displayName || 'Öğretmen'}</h2><p>{profile.subject || 'Branş'} dersi için devam ve not işlemlerinizi buradan yönetin.</p></div><div className="welcome-art">✦</div></section>
    <div className="metric-grid three">
      <MetricCard icon="◷" label="Devamsızlık" value="Yoklama al" sub="Her öğrenci varsayılan olarak var" tint="blue" />
      <MetricCard icon="✎" label="Not işlemleri" value="Not gir / düzenle" sub="Sınav ve sözlü · 3 dönem" tint="violet" />
      <MetricCard icon="♧" label="Öğrenci listesi" value={studentCount == null ? '—' : studentCount.toLocaleString('tr-TR')} sub="5, 6, 7 ve 8. sınıflar" tint="mint" />
    </div>
    <section className="section-card"><div className="section-heading"><div><p className="eyebrow">HIZLI ERİŞİM</p><h3>Bugün ne yapmak istersiniz?</h3></div><span className="subtle-pill">Öğretmen araçları</span></div><div className="quick-grid"><button className="quick-action" onClick={() => onNavigate('attendance')}><div className="quick-icon blue">◷</div><div><strong>Devamsızlık gir</strong><small>Sınıfı ve ders saatini seçin, yoklamayı kaydedin.</small></div><span>→</span></button><button className="quick-action" onClick={() => onNavigate('grades')}><div className="quick-icon violet">✎</div><div><strong>Not gir / düzenle</strong><small>Öğrencilerin sınav ve sözlü puanlarını kaydedin.</small></div><span>→</span></button></div></section>
    <div className="notice-panel"><span>🔒</span><div><strong>Yoklama kaydı değiştirilemez.</strong><p>Kaydedilen yoklama kilitlenir. Yanlış kayıtlar için okul yönetimiyle iletişime geçin; YBS yalnızca özür durumunu işler.</p></div></div>
  </div>;
}

function MetricCard({ icon, label, value, sub, tint = 'blue' }) {
  return <div className="metric-card"><div className={`metric-icon ${tint}`}>{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-sub">{sub}</div></div>;
}

function TeacherAttendance({ profile, onFlash }) {
  const [grade, setGrade] = useState('5');
  const [section, setSection] = useState('A');
  const [lesson, setLesson] = useState('1');
  const [date, setDate] = useState(localDate());
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDocs(query(collection(db, 'students'), where('classGrade', '==', Number(grade)), where('section', '==', section), orderBy('schoolNumber', 'asc')))
      .then(snap => {
        if (!active) return;
        const found = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudents(found);
        setMarks(Object.fromEntries(found.map(s => [s.id, true])));
      })
      .catch(err => { if (active) onFlash('error', `Öğrenci listesi alınamadı: ${err.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [grade, section]);

  const toggle = id => setMarks(old => ({ ...old, [id]: !(old[id] ?? true) }));
  const markCount = students.filter(s => !(marks[s.id] ?? true)).length;
  const save = async () => {
    if (!students.length) return onFlash('error', 'Önce YBS panelinden demo öğrencileri oluşturun.');
    if (!date) return onFlash('error', 'Yoklama tarihini seçin.');
    setSaving(true);
    try {
      const sid = makeSessionId(date, Number(grade), section, Number(lesson));
      const batch = writeBatch(db);
      batch.set(doc(db, 'attendanceSessions', sid), {
        date, classGrade: Number(grade), section, lesson: Number(lesson), teacherUid: profile.uid,
        teacherName: profile.displayName, subject: profile.subject, createdAt: serverTimestamp()
      });
      for (const student of students) {
        batch.set(doc(db, 'students', student.id, 'attendance', sid), {
          studentId: student.id, studentName: student.fullName, schoolNumber: student.schoolNumber,
          date, sessionId: sid, classGrade: Number(grade), section, lesson: Number(lesson),
          teacherUid: profile.uid, teacherName: profile.displayName, subject: profile.subject,
          present: marks[student.id] ?? true, recordedAt: serverTimestamp()
        });
      }
      await batch.commit();
      onFlash('success', `Yoklama kaydedildi. ${students.length} öğrenci için kayıt kilitlendi.`);
    } catch (err) {
      if (err.code === 'permission-denied' || err.code === 'already-exists') onFlash('error', 'Bu tarih, sınıf, şube ve ders için yoklama daha önce kaydedilmiş olabilir. Kayıtlar değiştirilemez.');
      else onFlash('error', `Yoklama kaydedilemedi: ${err.message}`);
    } finally { setSaving(false); }
  };

  return <div className="content-stack">
    <section className="page-intro"><div><p className="eyebrow">ÖĞRETMEN ARAÇLARI</p><h2>Devamsızlık girişi</h2><p className="muted">Öğrenci listesi sınıf ve şubeye göre otomatik yüklenir. Her öğrenci başlangıçta “Var” durumundadır.</p></div><div className="readonly-tag">● Değiştirilemez kayıt</div></section>
    <section className="section-card"><div className="section-heading"><div><h3>Yoklama bilgileri</h3><p className="muted small">Öğretmen: <strong>{profile.displayName}</strong> · {profile.subject || 'Branş belirtilmemiş'}</p></div><span className="subtle-pill">Adım 1 / 2</span></div>
      <div className="form-grid five">
        <FormField label="Tarih"><input className="input" type="date" value={date} max={localDate()} onChange={e => setDate(e.target.value)} /></FormField>
        <FormField label="Sınıf"><select className="input" value={grade} onChange={e => setGrade(e.target.value)}>{GRADES.map(n => <option key={n} value={n}>{n}. sınıf</option>)}</select></FormField>
        <FormField label="Şube"><select className="input" value={section} onChange={e => setSection(e.target.value)}>{SECTIONS.map(s => <option key={s} value={s}>{s} şubesi</option>)}</select></FormField>
        <FormField label="Kaçıncı ders"><select className="input" value={lesson} onChange={e => setLesson(e.target.value)}>{LESSONS.map(n => <option key={n} value={n}>{n}. ders</option>)}</select></FormField>
        <div className="teacher-chip"><div className="avatar">{(profile.displayName || 'Ö').slice(0, 1)}</div><div><strong>{profile.subject || 'Ders'}</strong><small>Öğretmen hesabı</small></div></div>
      </div>
    </section>
    <section className="section-card list-card"><div className="section-heading"><div><p className="eyebrow">ÖĞRENCİ LİSTESİ</p><h3>{grade}. sınıf / {section} şubesi</h3></div><div className="list-summary"><span className="summary-green">{students.length - markCount} var</span><span className="summary-red">{markCount} yok</span></div></div>
      {loading ? <InlineLoading text="Öğrenciler yükleniyor…" /> : students.length === 0 ? <EmptyState title="Bu şubede öğrenci bulunamadı" text="YBS hesabıyla giriş yapıp Genel Bakış ekranından demo öğrencileri oluşturun." /> : <>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>No</th><th>Öğrenci adı soyadı</th><th>Sınıf / şube</th><th>Durum</th><th>İşaretle</th></tr></thead><tbody>{students.map((s, i) => {
          const present = marks[s.id] ?? true;
          return <tr key={s.id}><td className="num-cell">{s.schoolNumber}</td><td><div className="student-cell"><span className="student-avatar">{s.fullName?.slice(0, 1) || 'Ö'}</span><strong>{s.fullName}</strong></div></td><td><span className="class-label">{s.classGrade}-{s.section}</span></td><td><span className={`status-pill ${present ? 'present' : 'absent'}`}><span />{present ? 'Var' : 'Yok'}</span></td><td><button className={`toggle-mark ${present ? 'mark-present' : 'mark-absent'}`} onClick={() => toggle(s.id)}>{present ? 'Yok olarak işaretle' : 'Yok işaretini kaldır'}</button></td></tr>;
        })}</tbody></table></div>
        <div className="table-actions"><div className="muted small">Tüm öğrenciler varsayılan olarak var kabul edilir. Kaydetme sonrası düzenleme yapılamaz.</div><button className="button primary" onClick={save} disabled={saving}>{saving ? 'Kaydediliyor…' : `Yoklamayı kaydet · ${students.length} öğrenci`} <span>→</span></button></div>
      </>}
    </section>
  </div>;
}

function TeacherGrades({ profile, onFlash }) {
  const [grade, setGrade] = useState('5');
  const [section, setSection] = useState('A');
  const [term, setTerm] = useState('1');
  const [type, setType] = useState('sinav');
  const [assessmentNo, setAssessmentNo] = useState('1');
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDocs(query(collection(db, 'students'), where('classGrade', '==', Number(grade)), where('section', '==', section), orderBy('schoolNumber', 'asc')))
      .then(snap => { if (active) setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); })
      .catch(err => { if (active) onFlash('error', `Öğrenci listesi alınamadı: ${err.message}`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [grade, section]);

  useEffect(() => {
    let active = true;
    if (!students.length) { setScores({}); return () => { active = false; }; }
    const load = async () => {
      const rows = await Promise.all(students.map(async student => {
        const snap = await getDocs(query(collection(db, 'students', student.id, 'grades'), where('teacherUid', '==', profile.uid)));
        const id = makeGradeId(profile.uid, Number(term), type, Number(assessmentNo));
        const found = snap.docs.find(d => d.id === id);
        return [student.id, found ? { score: String(found.data().score), createdAt: found.data().createdAt } : { score: '', createdAt: null }];
      }));
      if (active) setScores(Object.fromEntries(rows));
    };
    load().catch(err => { if (active) onFlash('error', `Kayıtlı notlar alınamadı: ${err.message}`); });
    return () => { active = false; };
  }, [students, profile.uid, term, type, assessmentNo]);

  const save = async () => {
    if (!students.length) return onFlash('error', 'Bu şubede öğrenci bulunamadı.');
    const entries = students.map(s => ({ student: s, raw: (scores[s.id]?.score ?? '').trim() })).filter(x => x.raw !== '');
    if (!entries.length) return onFlash('error', 'Kaydetmek için en az bir öğrencinin puanını girin.');
    const invalid = entries.find(x => !/^\d{1,3}$/.test(x.raw) || Number(x.raw) < 0 || Number(x.raw) > 100);
    if (invalid) return onFlash('error', `${invalid.student.fullName} için 0–100 arasında tam sayı girin.`);
    setSaving(true);
    try {
      const batch = writeBatch(db);
      for (const { student, raw } of entries) {
        const id = makeGradeId(profile.uid, Number(term), type, Number(assessmentNo));
        const previous = scores[student.id] || {};
        batch.set(doc(db, 'students', student.id, 'grades', id), {
          studentId: student.id, studentName: student.fullName, schoolNumber: student.schoolNumber,
          classGrade: Number(grade), section, subject: profile.subject, teacherUid: profile.uid,
          teacherName: profile.displayName, term: Number(term), assessmentType: type,
          assessmentNo: Number(assessmentNo), score: Number(raw),
          createdAt: previous.createdAt || serverTimestamp(), updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      onFlash('success', `${entries.length} öğrencinin notu kaydedildi. VBS ekranlarına canlı olarak yansır.`);
    } catch (err) { onFlash('error', `Notlar kaydedilemedi: ${err.message}`); }
    finally { setSaving(false); }
  };

  return <div className="content-stack">
    <section className="page-intro"><div><p className="eyebrow">ÖĞRETMEN ARAÇLARI</p><h2>Not işlemleri</h2><p className="muted">Sınav veya sözlü puanlarını dönem bazında girin. Kaydedilen puanlar daha sonra güncellenebilir.</p></div><div className="live-tag"><span className="pulse-dot" /> VBS ile canlı senkron</div></section>
    <section className="section-card"><div className="section-heading"><div><h3>Not türü ve sınıf seçimi</h3><p className="muted small">Öğretmen: <strong>{profile.displayName}</strong> · {profile.subject}</p></div><span className="subtle-pill">3 dönem desteklenir</span></div>
      <div className="form-grid five">
        <FormField label="Sınıf"><select className="input" value={grade} onChange={e => setGrade(e.target.value)}>{GRADES.map(n => <option key={n} value={n}>{n}. sınıf</option>)}</select></FormField>
        <FormField label="Şube"><select className="input" value={section} onChange={e => setSection(e.target.value)}>{SECTIONS.map(s => <option key={s} value={s}>{s} şubesi</option>)}</select></FormField>
        <FormField label="Dönem"><select className="input" value={term} onChange={e => setTerm(e.target.value)}>{TERMS.map(n => <option key={n} value={n}>{n}. dönem</option>)}</select></FormField>
        <FormField label="Not türü"><select className="input" value={type} onChange={e => setType(e.target.value)}><option value="sinav">Sınav</option><option value="sozlu">Sözlü</option></select></FormField>
        <FormField label="Kaçıncı not"><select className="input" value={assessmentNo} onChange={e => setAssessmentNo(e.target.value)}>{ASSESSMENTS.map(n => <option key={n} value={n}>{n}. {type === 'sinav' ? 'sınav' : 'sözlü'}</option>)}</select></FormField>
      </div>
    </section>
    <section className="section-card list-card"><div className="section-heading"><div><p className="eyebrow">PUAN GİRİŞİ</p><h3>{grade}-{section} · {term}. dönem / {type === 'sinav' ? 'Sınav' : 'Sözlü'} {assessmentNo}</h3></div><span className="subtle-pill">0–100 puan</span></div>
      {loading ? <InlineLoading text="Öğrenciler yükleniyor…" /> : students.length === 0 ? <EmptyState title="Öğrenci bulunamadı" text="YBS panelinden demo öğrenci listesini oluşturun." /> : <>
        <div className="table-wrap"><table className="data-table grade-table"><thead><tr><th>No</th><th>Öğrenci adı soyadı</th><th>Mevcut puan</th><th>Yeni / güncel puan</th></tr></thead><tbody>{students.map(s => <tr key={s.id}><td className="num-cell">{s.schoolNumber}</td><td><div className="student-cell"><span className="student-avatar">{s.fullName?.slice(0, 1) || 'Ö'}</span><strong>{s.fullName}</strong></div></td><td>{scores[s.id]?.score !== '' && scores[s.id]?.score != null ? <span className="score-chip">{scores[s.id].score} / 100</span> : <span className="muted">Girilmedi</span>}</td><td><div className="score-input-wrap"><input className="input score-input" type="number" min="0" max="100" step="1" value={scores[s.id]?.score ?? ''} onChange={e => setScores(old => ({ ...old, [s.id]: { ...(old[s.id] || {}), score: e.target.value } }))} placeholder="—" /><span>/ 100</span></div></td></tr>)}</tbody></table></div>
        <div className="table-actions"><div className="muted small">Boş bırakılan puanlar değiştirilmez. Aynı sınav/sözlü kaydı tekrar kaydedilirse güncellenir.</div><button className="button primary" onClick={save} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Notları kaydet / güncelle'} <span>→</span></button></div>
      </>}
    </section>
  </div>;
}

function YbsDashboard({ onFlash }) {
  const [studentCount, setStudentCount] = useState(null);
  const [attendanceCount, setAttendanceCount] = useState(null);
  const [recentAbsences, setRecentAbsences] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    getCountFromServer(collection(db, 'students')).then(s => { if (active) setStudentCount(s.data().count); }).catch(() => { if (active) setStudentCount(null); });
    getCountFromServer(collectionGroup(db, 'attendance')).then(s => { if (active) setAttendanceCount(s.data().count); }).catch(() => { if (active) setAttendanceCount(null); });
    getDocs(query(collectionGroup(db, 'attendance'), orderBy('date', 'desc'), limit(250))).then(s => { if (active) setRecentAbsences(s.docs.filter(d => d.data().present === false).length); }).catch(() => {});
    return () => { active = false; };
  }, [refresh]);

  const seed = async () => {
    setSeeding(true);
    try {
      const existing = await getDocs(collection(db, 'students'));
      const have = new Set(existing.docs.map(d => d.id));
      const missing = makeDemoStudents().filter(s => !have.has(s.id));
      if (!missing.length) {
        onFlash('success', 'Demo öğrenci listesi zaten hazır.');
        setStudentCount(existing.size);
        return;
      }
      for (let offset = 0; offset < missing.length; offset += 400) {
        const batch = writeBatch(db);
        for (const student of missing.slice(offset, offset + 400)) {
          const { id, ...data } = student;
          batch.set(doc(db, 'students', id), { ...data, createdAt: serverTimestamp() });
        }
        await batch.commit();
      }
      setSeedDone(true); setRefresh(v => v + 1);
      onFlash('success', `${missing.length} demo öğrenci kaydı oluşturuldu. Her sınıf/şube için ayrı liste hazır.`);
    } catch (err) { onFlash('error', `Demo verileri oluşturulamadı: ${err.message}`); }
    finally { setSeeding(false); }
  };

  return <div className="content-stack">
    <section className="welcome-banner ybs-banner"><div><p className="eyebrow light">YÖNETİM BİLİŞİM SİSTEMİ</p><h2>Okul kayıtları tek yerde.</h2><p>Devamsızlıkları özür durumuna göre işleyin, öğrenci ve veli hesaplarını eşleştirin.</p></div><div className="welcome-art">⌘</div></section>
    <div className="metric-grid three">
      <MetricCard icon="♧" label="Öğrenci kayıtları" value={studentCount == null ? '—' : studentCount.toLocaleString('tr-TR')} sub="Demo listesi: 936 öğrenci" tint="mint" />
      <MetricCard icon="◷" label="Yoklama kayıtları" value={attendanceCount == null ? '—' : attendanceCount.toLocaleString('tr-TR')} sub="Öğretmen kayıtları kilitlidir" tint="blue" />
      <MetricCard icon="!" label="Son 250 kayıtta yok" value={recentAbsences.toLocaleString('tr-TR')} sub="Özür durumu yönetilebilir" tint="rose" />
    </div>
    <section className="section-card"><div className="section-heading"><div><p className="eyebrow">İŞ AKIŞI</p><h3>Yönetim araçları</h3><p className="muted small">Önce demo öğrencileri oluşturun, ardından VBS hesaplarını öğrencilerle bağlayın.</p></div><span className="subtle-pill">YBS kontrolü</span></div>
      <div className="admin-action-grid"><div className="admin-action"><div className="action-icon mint">♧</div><h4>Demo öğrenci listesi</h4><p>5–8. sınıflar, A–M şubeleri ve her sınıfta 18 öğrenci. İsimler ve okul numaraları kurgusaldır.</p><button className="button secondary" onClick={seed} disabled={seeding || (studentCount != null && studentCount >= 936)}>{seeding ? 'Oluşturuluyor…' : studentCount === 936 || seedDone ? 'Liste hazır ✓' : 'Demo öğrencileri oluştur'}</button></div>
      <div className="admin-action"><div className="action-icon blue">◷</div><h4>Devamsızlık ve özür</h4><p>Öğretmen kayıtlarını görüntüleyin, “Özürlü” veya “Özürsüz” durumunu işleyin.</p><span className="text-link">Sol menüden Devamsızlık Yönetimi →</span></div>
      <div className="admin-action"><div className="action-icon violet">♧</div><h4>Veli eşleştirme</h4><p>VBS için oluşturduğunuz hesabın UID bilgisini ilgili öğrencinin kaydına bağlayın.</p><span className="text-link">Sol menüden Öğrenci / Veli Bağla →</span></div></div>
    </section>
    <div className="notice-panel"><span>🛡️</span><div><strong>Yetki modeli</strong><p>YBS devamsızlık kaydını değiştiremez; yalnızca özür kararını ekler. Notları öğretmen güncelleyebilir. VBS yalnızca kendisine bağlanan öğrencinin bilgilerini okur.</p></div></div>
  </div>;
}

function YbsReview({ profile, onFlash }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('absent');
  const [savingId, setSavingId] = useState('');
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    setLoading(true);
    const q = query(collectionGroup(db, 'attendance'), orderBy('date', 'desc'), limit(350));
    const unsub = onSnapshot(q, async snap => {
      const base = snap.docs.map(d => ({ id: d.id, ...d.data(), studentId: d.ref.parent.parent.id }));
      const hydrated = await Promise.all(base.map(async row => {
        if (row.present) return { ...row, reasonStatus: '', reasonText: '' };
        try {
          const rs = await getDocs(query(collection(db, 'students', row.studentId, 'attendanceReasons'), where('sessionId', '==', row.sessionId), limit(1)));
          const r = rs.docs[0]?.data();
          return { ...row, reasonStatus: r?.status || '', reasonText: r?.reason || '' };
        } catch { return { ...row, reasonStatus: '', reasonText: '' }; }
      }));
      setRecords(hydrated);
      setDrafts(old => {
        const copy = { ...old };
        for (const r of hydrated) if (r.present === false && !copy[recordKey(r)]) copy[recordKey(r)] = { status: r.reasonStatus || '', reason: r.reasonText || '' };
        return copy;
      });
      setLoading(false);
    }, err => { onFlash('error', `Devamsızlık kayıtları okunamadı: ${err.message}`); setLoading(false); });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => records.filter(r => {
    if (gradeFilter !== 'all' && Number(gradeFilter) !== Number(r.classGrade)) return false;
    if (sectionFilter !== 'all' && sectionFilter !== r.section) return false;
    if (dateFilter && r.date !== dateFilter) return false;
    if (statusFilter === 'absent' && r.present) return false;
    if (statusFilter === 'present' && !r.present) return false;
    return true;
  }), [records, gradeFilter, sectionFilter, dateFilter, statusFilter]);

  const saveReason = async row => {
    const key = recordKey(row); const draft = drafts[key] || {};
    if (!['excused', 'unexcused'].includes(draft.status)) return onFlash('error', 'Önce Özürlü veya Özürsüz durumunu seçin.');
    setSavingId(key);
    try {
      await setDoc(doc(db, 'students', row.studentId, 'attendanceReasons', row.sessionId), {
        studentId: row.studentId, sessionId: row.sessionId, date: row.date, classGrade: row.classGrade,
        section: row.section, lesson: row.lesson, status: draft.status, reason: (draft.reason || '').trim(),
        reviewedBy: profile.uid, reviewedAt: serverTimestamp()
      }, { merge: true });
      setRecords(old => old.map(r => recordKey(r) === key ? { ...r, reasonStatus: draft.status, reasonText: draft.reason || '' } : r));
      onFlash('success', `${row.studentName} için özür durumu kaydedildi. VBS ekranında görünür.`);
    } catch (err) { onFlash('error', `Özür durumu kaydedilemedi: ${err.message}`); }
    finally { setSavingId(''); }
  };

  return <div className="content-stack">
    <section className="page-intro"><div><p className="eyebrow">YBS / DEVAMSIZLIK</p><h2>Devamsızlık yönetimi</h2><p className="muted">Öğretmenin kaydettiği yoklama kilitlidir. Bu ekranda yalnızca özür durumunu ve açıklamasını işleyebilirsiniz.</p></div><div className="readonly-tag">🔒 Yoklama değiştirilemez</div></section>
    <section className="section-card"><div className="filter-row">
      <FormField label="Sınıf"><select className="input" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}><option value="all">Tüm sınıflar</option>{GRADES.map(n => <option key={n} value={n}>{n}. sınıf</option>)}</select></FormField>
      <FormField label="Şube"><select className="input" value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}><option value="all">Tüm şubeler</option>{SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></FormField>
      <FormField label="Tarih"><input className="input" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} /></FormField>
      <FormField label="Durum"><select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="absent">Yalnızca yok</option><option value="present">Yalnızca var</option><option value="all">Tüm kayıtlar</option></select></FormField>
    </div><div className="section-heading compact-heading"><div><h3>Kayıtlar</h3><p className="muted small">En güncel 350 öğrenci yoklama kaydı arasından filtrelenir.</p></div><span className="subtle-pill">{filtered.length} sonuç</span></div>
      {loading ? <InlineLoading text="Kayıtlar canlı olarak yükleniyor…" /> : filtered.length === 0 ? <EmptyState title="Bu filtrelerle kayıt bulunamadı" text="Öğretmen henüz yoklama girmemiş olabilir veya filtreleri değiştirebilirsiniz." /> : <div className="table-wrap"><table className="data-table review-table"><thead><tr><th>Tarih / ders</th><th>Öğrenci</th><th>Sınıf</th><th>Yoklama</th><th>Özür durumu</th><th>Açıklama</th><th>İşlem</th></tr></thead><tbody>{filtered.slice(0, 220).map(row => {
        const key = recordKey(row); const draft = drafts[key] || { status: row.reasonStatus || '', reason: row.reasonText || '' };
        return <tr key={`${row.studentId}_${row.sessionId}`}><td><strong>{showDate(row.date)}</strong><small className="table-sub">{row.lesson}. ders</small></td><td><strong>{row.studentName}</strong><small className="table-sub">No: {row.schoolNumber}</small></td><td><span className="class-label">{row.classGrade}-{row.section}</span></td><td><span className={`status-pill ${row.present ? 'present' : 'absent'}`}><span />{row.present ? 'Var' : 'Yok'}</span></td><td>{row.present ? <span className="muted">—</span> : <select className="input compact-input" value={draft.status} onChange={e => setDrafts(old => ({ ...old, [key]: { ...draft, status: e.target.value } }))}><option value="">Seçiniz</option><option value="excused">Özürlü</option><option value="unexcused">Özürsüz</option></select>}</td><td>{row.present ? <span className="muted">—</span> : <input className="input reason-input" value={draft.reason} onChange={e => setDrafts(old => ({ ...old, [key]: { ...draft, reason: e.target.value } }))} placeholder="Kısa açıklama" maxLength={300} />}</td><td>{row.present ? <span className="muted">—</span> : <button className="button mini primary" onClick={() => saveReason(row)} disabled={savingId === key}>{savingId === key ? '…' : 'Kaydet'}</button>}{!row.present && row.reasonStatus && <small className="table-sub">Son durum: {row.reasonStatus === 'excused' ? 'Özürlü' : 'Özürsüz'}</small>}</td></tr>;
      })}</tbody></table></div>}
      {filtered.length > 220 && <p className="muted small bottom-note">Ekran performansı için ilk 220 satır gösteriliyor. Tarih veya sınıf filtresi kullanarak daraltın.</p>}
    </section>
  </div>;
}

function StudentLink({ onFlash }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState('');
  useEffect(() => {
    return onSnapshot(query(collection(db, 'students'), orderBy('schoolNumber', 'asc')), snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(items);
      setDrafts(old => {
        const next = { ...old };
        for (const s of items) if (next[s.id] === undefined) next[s.id] = s.parentUid || '';
        return next;
      });
      setLoading(false);
    }, err => { onFlash('error', `Öğrenciler okunamadı: ${err.message}`); setLoading(false); });
  }, []);
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return students;
    return students.filter(s => String(s.schoolNumber).includes(needle) || s.fullName?.toLocaleLowerCase('tr-TR').includes(needle) || `${s.classGrade}-${s.section}`.toLowerCase().includes(needle));
  }, [students, search]);
  const saveLink = async student => {
    const parentUid = (drafts[student.id] || '').trim() || null;
    setSavingId(student.id);
    try {
      await setDoc(doc(db, 'students', student.id), { parentUid, updatedAt: serverTimestamp() }, { merge: true });
      onFlash('success', parentUid ? `${student.fullName} için VBS hesabı bağlandı.` : `${student.fullName} için VBS bağlantısı kaldırıldı.`);
    } catch (err) { onFlash('error', `Veli bağlantısı kaydedilemedi: ${err.message}. UID’nin role=vbs olan bir users belgesine ait olduğunu kontrol edin.`); }
    finally { setSavingId(''); }
  };
  return <div className="content-stack">
    <section className="page-intro"><div><p className="eyebrow">YBS / VBS BAĞLANTISI</p><h2>Öğrenci ve veli eşleştirme</h2><p className="muted">Firebase Authentication’da oluşturulmuş VBS hesabının UID değerini öğrenciye bağlayın. Veli yalnızca eşleşen öğrencinin kayıtlarını görebilir.</p></div><div className="live-tag">♧ Güvenli eşleştirme</div></section>
    <section className="section-card"><div className="search-bar"><div><h3>Öğrenciler</h3><p className="muted small">Bağlı veli hesabı boş bırakılırsa öğrenci VBS ekranında görünmez.</p></div><div className="search-input-wrap"><span>⌕</span><input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="İsim, okul numarası veya sınıf ara" /></div></div>
      {loading ? <InlineLoading text="Öğrenci kayıtları yükleniyor…" /> : !students.length ? <EmptyState title="Henüz öğrenci yok" text="Genel Bakış ekranından demo öğrencileri oluşturun." /> : <div className="table-wrap"><table className="data-table link-table"><thead><tr><th>Okul no</th><th>Öğrenci</th><th>Sınıf</th><th>VBS hesap UID</th><th>İşlem</th></tr></thead><tbody>{filtered.slice(0, 80).map(s => <tr key={s.id}><td className="num-cell">{s.schoolNumber}</td><td><div className="student-cell"><span className="student-avatar">{s.fullName?.slice(0, 1)}</span><strong>{s.fullName}</strong></div></td><td><span className="class-label">{s.classGrade}-{s.section}</span></td><td><input className="input uid-input" value={drafts[s.id] ?? ''} onChange={e => setDrafts(old => ({ ...old, [s.id]: e.target.value }))} placeholder="Firebase Auth UID" /></td><td><button className="button mini primary" onClick={() => saveLink(s)} disabled={savingId === s.id}>{savingId === s.id ? 'Kaydediliyor…' : 'Bağla'}</button></td></tr>)}</tbody></table></div>}
      {filtered.length > 80 && <p className="muted small bottom-note">{filtered.length} öğrenci bulundu; performans için ilk 80 kayıt gösteriliyor. Daha dar arama yapın.</p>}
    </section>
    <div className="notice-panel"><span>💡</span><div><strong>UID nereden bulunur?</strong><p>Firebase Console → Authentication → Users bölümünden veli hesabını seçin ve User UID değerini kopyalayın. Önce Firestore’da users/{'{UID}'} belgesinin rolünü <code>vbs</code> yapın.</p></div></div>
  </div>;
}

function FormField({ label, children }) { return <label className="form-field"><span>{label}</span>{children}</label>; }
function InlineLoading({ text }) { return <div className="inline-loading"><div className="loader small-loader" />{text}</div>; }
function EmptyState({ title, text }) { return <div className="empty-state"><div>⌕</div><h4>{title}</h4><p>{text}</p></div>; }
function recordKey(row) { return `${row.studentId}_${row.sessionId}`; }
function authErrorText(err) {
  const messages = {
    'auth/invalid-credential': 'E-posta veya şifre hatalı.',
    'auth/invalid-email': 'Geçerli bir e-posta adresi girin.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.',
    'auth/network-request-failed': 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.'
  };
  return messages[err.code] || `Giriş yapılamadı: ${err.message}`;
}

export default App;
