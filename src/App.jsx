import { useState, useEffect, useRef, useCallback } from "react";

const SUPABASE_URL = "https://lcpbwrwecoqgunpqpkyy.supabase.co";
const SUPABASE_KEY = "sb_publishable_qo-7309mscYIWMDvM_lfFA_jOsyST58";

// ── Minimal Supabase client (no SDK needed) ──────────────────────────────────
const sb = {
  async query(path, opts = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: opts.prefer || "return=representation",
        ...opts.headers,
      },
      ...opts,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },
  get: (path) => sb.query(path),
  post: (path, body) => sb.query(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) => sb.query(path, { method: "PATCH", body: JSON.stringify(body), prefer: "return=representation" }),
  delete: (path) => sb.query(path, { method: "DELETE", prefer: "return=minimal" }),
};

function slugify(n) { return n.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""); }

const C = {
  bg: "#F2F2F7", card: "#FFFFFF", accent: "#007AFF", label: "#000000",
  secondaryLabel: "rgba(60,60,67,0.6)", tertiaryLabel: "rgba(60,60,67,0.3)",
  separator: "rgba(60,60,67,0.2)", destructive: "#FF3B30", fill2: "rgba(120,120,128,0.12)",
};
const TOTE_COLORS = ["#007AFF","#34C759","#FF9500","#FF3B30","#AF52DE","#FF2D55","#5AC8FA","#FFCC00"];
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif";

// ── QR Code component (loads qrcodejs from CDN) ──────────────────────────────
function QRCode({ value, size = 220 }) {
  const ref = useRef();
  useEffect(() => {
    if (!ref.current || !value) return;
    const render = () => {
      ref.current.innerHTML = "";
      new window.QRCode(ref.current, { text: value, width: size, height: size, colorDark: "#000000", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
    };
    if (window.QRCode) { render(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.onload = render;
    document.head.appendChild(s);
  }, [value, size]);
  return <div ref={ref} style={{ width: size, height: size, borderRadius: 10, overflow: "hidden" }} />;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ small }) {
  const sz = small ? 20 : 36;
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding: small ? 0 : 60 }}>
      <div style={{ width:sz, height:sz, border:`${small?2:3}px solid rgba(0,0,0,0.1)`, borderTopColor:C.accent, borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Tote Viewer (public URL: ?tote=slug) ─────────────────────────────────────
function ToteViewer({ slug }) {
  const [tote, setTote] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const totes = await sb.get(`totes?select=*`);
        const found = (totes || []).find((t) => slugify(t.name) === slug);
        if (!found) { setLoading(false); return; }
        setTote(found);
        const p = await sb.get(`photos?tote_id=eq.${found.id}&order=created_at.asc`);
        setPhotos(p || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:FONT }}><Spinner /></div>;
  if (!tote) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:FONT }}>
      <div style={{ fontSize:64, marginBottom:12 }}>📦</div>
      <div style={{ fontSize:20, fontWeight:600 }}>Tote Not Found</div>
      <div style={{ color:C.secondaryLabel, marginTop:6, fontSize:15 }}>This tote may have been removed.</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FONT }}>
      {lightbox !== null && (
        <div onClick={() => setLightbox(null)} style={{ position:"fixed", inset:0, background:"#000000EE", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <img src={photos[lightbox].data} style={{ maxWidth:"92vw", maxHeight:"88vh", borderRadius:12, objectFit:"contain" }} alt="" />
          <div style={{ position:"absolute", top:20, right:20, color:"#fff", fontSize:18, cursor:"pointer", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,0.15)", borderRadius:"50%" }}>✕</div>
        </div>
      )}
      <div style={{ background:"rgba(242,242,247,0.9)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderBottom:`0.5px solid ${C.separator}`, padding:"14px 20px 12px", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ fontSize:12, color:C.secondaryLabel, fontWeight:600, textTransform:"uppercase", letterSpacing:0.5 }}>Tote Contents</div>
        <div style={{ fontSize:28, fontWeight:700, letterSpacing:-0.5, marginTop:2 }}>{tote.name}</div>
        {tote.note && <div style={{ fontSize:14, color:C.secondaryLabel, marginTop:2 }}>{tote.note}</div>}
      </div>
      <div style={{ padding:"16px 0 40px" }}>
        {photos.length === 0
          ? <div style={{ textAlign:"center", padding:"60px 0", color:C.tertiaryLabel, fontSize:15 }}>No photos in this tote.</div>
          : <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
              {photos.map((p,i) => (
                <div key={p.id} onClick={() => setLightbox(i)} style={{ aspectRatio:"1", overflow:"hidden", cursor:"pointer", position:"relative" }}>
                  <img src={p.data} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} alt={p.caption||""} />
                  {p.caption && <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(0,0,0,0.62))", padding:"18px 6px 6px", fontSize:11, color:"#fff", fontWeight:500 }}>{p.caption}</div>}
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [totes, setTotes] = useState([]);
  const [screen, setScreen] = useState("list");
  const [activeTote, setActiveTote] = useState(null);
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingCaption, setEditingCaption] = useState(null);
  const [captionVal, setCaptionVal] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState([]); // photos for current tote
  const fileRef = useRef();

  const params = new URLSearchParams(window.location.search);
  const viewSlug = params.get("tote");

  // Load all totes on mount
  useEffect(() => {
    if (viewSlug) return;
    (async () => {
      try {
        const data = await sb.get("totes?select=*&order=created_at.asc");
        setTotes(data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  // Load photos when active tote changes
  useEffect(() => {
    if (!activeTote) return;
    (async () => {
      try {
        const data = await sb.get(`photos?tote_id=eq.${activeTote}&order=created_at.asc`);
        setPhotos(data || []);
      } catch (e) { console.error(e); }
    })();
  }, [activeTote]);

  if (viewSlug) return <ToteViewer slug={viewSlug} />;

  const baseUrl = window.location.href.split("?")[0];
  const current = totes.find((t) => t.id === activeTote);

  async function addTote() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const color = TOTE_COLORS[totes.length % TOTE_COLORS.length];
      const [created] = await sb.post("totes", { name: newName.trim(), note: newNote.trim(), color });
      setTotes((prev) => [...prev, created]);
      setNewName(""); setNewNote("");
      setActiveTote(created.id);
      setPhotos([]);
      setScreen("detail");
    } catch (e) { alert("Error creating tote: " + e.message); }
    setSaving(false);
  }

  async function deleteTote(id) {
    if (!confirm("Delete this tote and all its photos?")) return;
    setSaving(true);
    try {
      await sb.delete(`totes?id=eq.${id}`);
      setTotes((prev) => prev.filter((t) => t.id !== id));
      setScreen("list");
    } catch (e) { alert("Error deleting: " + e.message); }
    setSaving(false);
  }

  function handleFiles(e) {
    const files = Array.from(e.target.files);
    let done = 0;
    files.forEach((f) => {
      const r = new FileReader();
      r.onload = async (ev) => {
        try {
          const [photo] = await sb.post("photos", { tote_id: activeTote, data: ev.target.result, name: f.name, caption: "" });
          setPhotos((prev) => [...prev, photo]);
        } catch (e) { console.error(e); }
        done++;
      };
      r.readAsDataURL(f);
    });
    e.target.value = "";
  }

  async function removePhoto(id) {
    try {
      await sb.delete(`photos?id=eq.${id}`);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (e) { alert("Error removing photo: " + e.message); }
    setLightbox(null);
  }

  async function saveCaption() {
    const photo = photos[editingCaption];
    try {
      await sb.patch(`photos?id=eq.${photo.id}`, { caption: captionVal });
      setPhotos((prev) => prev.map((p, i) => i === editingCaption ? { ...p, caption: captionVal } : p));
    } catch (e) { alert("Error saving caption: " + e.message); }
    setEditingCaption(null);
  }

  // ── LIST ───────────────────────────────────────────────────────────────────
  if (screen === "list") return (
    <div style={{ ...S.root, fontFamily:FONT }}>
      <div style={S.navBar}>
        <div style={{ width:70 }} />
        <div style={S.navTitle}>My Totes</div>
        <div style={{ width:70, display:"flex", justifyContent:"flex-end" }}>
          <button style={S.navBtn} onClick={() => setScreen("addTote")}>
            <span style={{ fontSize:28, color:C.accent, lineHeight:1, display:"block", marginTop:-2 }}>+</span>
          </button>
        </div>
      </div>
      <div style={{ overflowY:"auto", flex:1 }}>
        {loading ? <Spinner /> : totes.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"100px 32px", textAlign:"center" }}>
            <div style={{ fontSize:64, marginBottom:16 }}>📦</div>
            <div style={{ fontSize:22, fontWeight:700, letterSpacing:-0.3, marginBottom:8 }}>No Totes Yet</div>
            <div style={{ fontSize:15, color:C.secondaryLabel, lineHeight:1.55, maxWidth:260 }}>
              Tap + to create a tote, add photos of what's inside, then share the QR code link with anyone.
            </div>
          </div>
        ) : (
          <div style={{ padding:"20px 16px 40px" }}>
            <div style={S.card}>
              {totes.map((t, i) => (
                <div key={t.id}>
                  <div style={{ display:"flex", alignItems:"center", padding:"12px 16px", cursor:"pointer", gap:14 }}
                    onClick={() => { setActiveTote(t.id); setPhotos([]); setScreen("detail"); }}>
                    <div style={{ width:46, height:46, borderRadius:12, background:t.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>📦</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:17, fontWeight:500 }}>{t.name}</div>
                      {t.note && <div style={{ fontSize:14, color:C.secondaryLabel, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.note}</div>}
                    </div>
                    <div style={{ fontSize:22, color:C.tertiaryLabel, fontWeight:300 }}>›</div>
                  </div>
                  {i < totes.length-1 && <div style={{ height:"0.5px", background:C.separator, marginLeft:76 }} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── ADD TOTE ───────────────────────────────────────────────────────────────
  if (screen === "addTote") return (
    <div style={{ ...S.root, fontFamily:FONT }}>
      <div style={S.navBar}>
        <button style={S.navBtn} onClick={() => setScreen("list")}><span style={{ fontSize:17, color:C.accent }}>‹ Back</span></button>
        <div style={S.navTitle}>New Tote</div>
        <button style={{ ...S.navBtn, opacity:newName.trim()&&!saving?1:0.35 }} onClick={addTote} disabled={!newName.trim()||saving}>
          {saving ? <Spinner small /> : <span style={{ fontSize:17, fontWeight:600, color:C.accent }}>Done</span>}
        </button>
      </div>
      <div style={{ padding:"32px 20px", overflowY:"auto", flex:1 }}>
        <div style={S.sectionLabel}>Tote Name</div>
        <div style={S.card}>
          <input style={S.textField} placeholder="e.g. Winter Clothes" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus onKeyDown={(e) => e.key==="Enter" && addTote()} />
        </div>
        <div style={{ ...S.sectionLabel, marginTop:24 }}>Note (Optional)</div>
        <div style={S.card}>
          <input style={S.textField} placeholder="Add a description…" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
        </div>
      </div>
    </div>
  );

  // ── QR ─────────────────────────────────────────────────────────────────────
  if (screen === "qr" && current) {
    const toteUrl = `${baseUrl}?tote=${slugify(current.name)}`;
    return (
      <div style={{ ...S.root, fontFamily:FONT }}>
        <div style={S.navBar}>
          <button style={S.navBtn} onClick={() => setScreen("detail")}><span style={{ fontSize:17, color:C.accent }}>‹ Back</span></button>
          <div style={S.navTitle}>QR Label</div>
          <button style={S.navBtn} onClick={() => window.print()}><span style={{ fontSize:17, color:C.accent }}>Print</span></button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"40px 24px", overflowY:"auto", flex:1 }}>
          <div style={{ background:C.card, borderRadius:24, padding:"32px 28px", display:"flex", flexDirection:"column", alignItems:"center", boxShadow:"0 4px 32px rgba(0,0,0,0.10)", width:"100%", maxWidth:310, boxSizing:"border-box" }}>
            <div style={{ width:60, height:60, borderRadius:14, background:current.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, marginBottom:14 }}>📦</div>
            <div style={{ fontSize:22, fontWeight:700, letterSpacing:-0.4, marginBottom:current.note?4:20, textAlign:"center" }}>{current.name}</div>
            {current.note && <div style={{ fontSize:13, color:C.secondaryLabel, marginBottom:20 }}>{current.note}</div>}
            <div style={{ width:"100%", height:"0.5px", background:C.separator, marginBottom:24 }} />
            <QRCode value={toteUrl} size={220} />
            <div style={{ marginTop:16, fontSize:10, color:C.tertiaryLabel, wordBreak:"break-all", textAlign:"center", maxWidth:240, lineHeight:1.5 }}>{toteUrl}</div>
          </div>
          <div style={{ marginTop:20, fontSize:13, color:C.secondaryLabel, textAlign:"center", maxWidth:270, lineHeight:1.65 }}>
            Anyone with this QR code or link can view this tote's photos. Tap <strong>Print</strong> to save as PDF.
          </div>
          {/* Shareable link */}
          <div style={{ marginTop:16, background:C.card, borderRadius:14, padding:"14px 16px", width:"100%", maxWidth:310, boxSizing:"border-box", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:12, fontWeight:600, color:C.secondaryLabel, textTransform:"uppercase", letterSpacing:0.5, marginBottom:8 }}>Share Link</div>
            <div style={{ fontSize:13, color:C.accent, wordBreak:"break-all", lineHeight:1.5, marginBottom:10 }}>{toteUrl}</div>
            <button onClick={() => navigator.clipboard.writeText(toteUrl).then(() => alert("Link copied!"))}
              style={{ width:"100%", padding:"10px", background:C.accent, color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:FONT }}>
              Copy Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── DETAIL ─────────────────────────────────────────────────────────────────
  if (screen === "detail" && current) return (
    <div style={{ ...S.root, fontFamily:FONT }}>
      {lightbox !== null && photos[lightbox] && (
        <div style={{ position:"fixed", inset:0, background:"#000000F2", zIndex:999, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <img src={photos[lightbox].data} style={{ maxWidth:"92vw", maxHeight:"70vh", objectFit:"contain", borderRadius:10 }} alt="" />
          <div style={{ display:"flex", gap:16, marginTop:28 }}>
            <button onClick={() => { setCaptionVal(photos[lightbox].caption||""); setEditingCaption(lightbox); setLightbox(null); }}
              style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", padding:"10px 22px", borderRadius:22, fontSize:15, cursor:"pointer", fontFamily:FONT }}>
              ✏️ Caption
            </button>
            <button onClick={() => removePhoto(photos[lightbox].id)}
              style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#FF6B6B", padding:"10px 22px", borderRadius:22, fontSize:15, cursor:"pointer", fontFamily:FONT }}>
              🗑 Remove
            </button>
          </div>
          <div onClick={() => setLightbox(null)} style={{ position:"absolute", top:20, right:20, color:"rgba(255,255,255,0.8)", fontSize:18, cursor:"pointer", width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,0.15)", borderRadius:"50%" }}>✕</div>
        </div>
      )}

      {editingCaption !== null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:998, display:"flex", alignItems:"flex-end" }}>
          <div style={{ background:C.card, borderRadius:"20px 20px 0 0", padding:"16px 20px 48px", width:"100%", boxSizing:"border-box" }}>
            <div style={{ width:36, height:5, background:C.tertiaryLabel, borderRadius:3, margin:"0 auto 18px" }} />
            <div style={{ fontSize:17, fontWeight:600, textAlign:"center", marginBottom:18 }}>Edit Caption</div>
            <input style={{ ...S.textField, background:C.fill2, borderRadius:12, padding:"14px 16px", width:"100%", boxSizing:"border-box", marginBottom:14 }}
              value={captionVal} onChange={(e) => setCaptionVal(e.target.value)} placeholder="Add a caption…" autoFocus />
            <button onClick={saveCaption} style={{ width:"100%", padding:"14px", background:C.accent, color:"#fff", border:"none", borderRadius:14, fontSize:17, fontWeight:600, cursor:"pointer", fontFamily:FONT, marginBottom:10 }}>Save</button>
            <button onClick={() => setEditingCaption(null)} style={{ width:"100%", padding:"14px", background:C.fill2, color:C.label, border:"none", borderRadius:14, fontSize:17, cursor:"pointer", fontFamily:FONT }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={S.navBar}>
        <button style={S.navBtn} onClick={() => setScreen("list")}><span style={{ fontSize:17, color:C.accent }}>‹ Totes</span></button>
        <div style={S.navTitle}>{current.name}</div>
        <button style={S.navBtn} onClick={() => setScreen("qr")}><span style={{ fontSize:15, fontWeight:600, color:C.accent }}>QR</span></button>
      </div>

      <div style={{ overflowY:"auto", flex:1 }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"28px 20px 20px", textAlign:"center" }}>
          <div style={{ width:76, height:76, borderRadius:20, background:current.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:42, boxShadow:`0 8px 24px ${current.color}55` }}>📦</div>
          <div style={{ fontSize:26, fontWeight:700, letterSpacing:-0.5, marginTop:12 }}>{current.name}</div>
          {current.note && <div style={{ fontSize:14, color:C.secondaryLabel, marginTop:4 }}>{current.note}</div>}
          <div style={{ fontSize:13, color:C.tertiaryLabel, marginTop:3 }}>{photos.length} item{photos.length!==1?"s":""}</div>
        </div>

        <div style={{ display:"flex", gap:10, padding:"0 16px 24px" }}>
          {[
            { icon:"📷", label:"Add Photos", color:C.accent,       action:() => fileRef.current.click() },
            { icon:"⬛", label:"QR / Share", color:C.accent,       action:() => setScreen("qr") },
            { icon:"🗑",  label:"Delete",     color:C.destructive,  action:() => deleteTote(current.id) },
          ].map((a) => (
            <button key={a.label} onClick={a.action} style={{ flex:1, background:C.card, border:"none", borderRadius:14, padding:"14px 6px", cursor:"pointer", textAlign:"center", fontFamily:FONT, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize:22, marginBottom:5 }}>{a.icon}</div>
              <div style={{ fontSize:12, fontWeight:600, color:a.color }}>{a.label}</div>
            </button>
          ))}
        </div>

        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleFiles} />

        {photos.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 32px" }}>
            <div style={{ fontSize:52, marginBottom:12 }}>🖼️</div>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:6 }}>No Photos Yet</div>
            <div style={{ fontSize:14, color:C.secondaryLabel }}>Tap "Add Photos" to get started.</div>
          </div>
        ) : (
          <div style={{ paddingBottom:40 }}>
            <div style={{ ...S.sectionLabel, padding:"2px 20px 10px" }}>Photos</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
              {photos.map((p,i) => (
                <div key={p.id} style={{ aspectRatio:"1", overflow:"hidden", cursor:"pointer", position:"relative" }} onClick={() => setLightbox(i)}>
                  <img src={p.data} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} alt={p.caption||""} />
                  {p.caption && <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(0,0,0,0.65))", padding:"18px 6px 6px", fontSize:10, color:"#fff", fontWeight:500, lineHeight:1.3 }}>{p.caption}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return null;
}

const S = {
  root: { display:"flex", flexDirection:"column", height:"100vh", background:C.bg, maxWidth:430, margin:"0 auto", position:"relative", overflow:"hidden" },
  navBar: { background:"rgba(242,242,247,0.92)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderBottom:`0.5px solid ${C.separator}`, padding:"12px 16px 10px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, minHeight:44, flexShrink:0 },
  navTitle: { fontSize:17, fontWeight:600, letterSpacing:-0.2, position:"absolute", left:"50%", transform:"translateX(-50%)", whiteSpace:"nowrap" },
  navBtn: { background:"none", border:"none", cursor:"pointer", padding:"2px 4px", fontFamily:FONT, zIndex:1 },
  card: { background:C.card, borderRadius:14, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" },
  textField: { width:"100%", boxSizing:"border-box", padding:"14px 16px", fontSize:17, color:C.label, border:"none", outline:"none", background:"transparent", fontFamily:FONT },
  sectionLabel: { fontSize:12, fontWeight:600, color:C.secondaryLabel, letterSpacing:0.5, textTransform:"uppercase", marginBottom:8, paddingLeft:4 },
};

