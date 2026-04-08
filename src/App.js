import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Plus, X, Calendar, Camera, Star, Smile,
  ChevronLeft, ChevronRight, Trash2, Edit2, Upload,
  Sparkles, Clock, BookOpen, Image as ImageIcon, Save
} from "lucide-react";

const supabase = createClient(
  "https://ezuteasrojjpikncekaw.supabase.co",
  "sb_publishable_12Z0QTMWVsxxMV40PIeIpQ_LU_r-Jpj"
);

const START_DATE = new Date("2025-05-02");

const MOODS = [
  { value: "happy", emoji: "😊", label: "Happy" },
  { value: "love", emoji: "🥰", label: "In Love" },
  { value: "excited", emoji: "🤩", label: "Excited" },
  { value: "nostalgic", emoji: "🥺", label: "Nostalgic" },
  { value: "grateful", emoji: "🙏", label: "Grateful" },
  { value: "fun", emoji: "😂", label: "Fun" },
];

const TYPES = [
  { value: "moment", icon: Heart, label: "Moment", color: "#f43f5e" },
  { value: "milestone", icon: Star, label: "Milestone", color: "#f59e0b" },
  { value: "photo", icon: Camera, label: "Photo", color: "#8b5cf6" },
  { value: "date", icon: Calendar, label: "Date", color: "#10b981" },
];

function getDaysCount() {
  const today = new Date();
  const diff = today - START_DATE;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function FloatingHeart({ style }) {
  return (
    <motion.div
      className="absolute pointer-events-none text-rose-300/30 select-none"
      style={style}
      animate={{ y: [-20, -80], opacity: [0.4, 0], scale: [1, 1.5] }}
      transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 3 }}
    >
      ♥
    </motion.div>
  );
}

export default function App() {
  const [memories, setMemories] = useState([]);
  const [importantDates, setImportantDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home"); // home | memories | dates | add
  const [showModal, setShowModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [days, setDays] = useState(getDaysCount());

  const [form, setForm] = useState({
    title: "", description: "", date: "", type: "moment",
    mood: "happy", imageFile: null, image_url: ""
  });

  const [dateForm, setDateForm] = useState({
    title: "", date: "", icon: "❤️"
  });

  const DATE_ICONS = ["❤️", "💍", "🌹", "🎂", "✈️", "🏠", "🎉", "💑", "🌙", "⭐", "🎵", "📸"];

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setDays(getDaysCount()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: mem }, { data: dates }] = await Promise.all([
      supabase.from("memories").select("*").order("date", { ascending: false }),
      supabase.from("important_dates").select("*").order("date", { ascending: true }),
    ]);
    setMemories(mem || []);
    setImportantDates(dates || []);
    setLoading(false);
  };

  const handleSaveMemory = async () => {
    setUploading(true);
    try {
      let imageUrl = form.image_url;

      if (form.imageFile) {
        const ext = form.imageFile.name.split(".").pop();
        const fileName = `memories/${Date.now()}.${ext}`;
        await supabase.storage.from("memories").upload(fileName, form.imageFile);
        const { data: urlData } = supabase.storage.from("memories").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      const data = {
        title: form.title,
        description: form.description,
        date: form.date,
        type: form.type,
        mood: form.mood,
        image_url: imageUrl,
      };

      if (editingMemory) {
        await supabase.from("memories").update(data).eq("id", editingMemory.id);
      } else {
        await supabase.from("memories").insert([data]);
      }

      setShowModal(false);
      setEditingMemory(null);
      setForm({ title: "", description: "", date: "", type: "moment", mood: "happy", imageFile: null, image_url: "" });
      await fetchData();
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  };

  const handleDeleteMemory = async (id) => {
    if (!window.confirm("Delete this memory?")) return;
    await supabase.from("memories").delete().eq("id", id);
    setSelectedMemory(null);
    await fetchData();
  };

  const handleSaveDate = async () => {
    await supabase.from("important_dates").insert([dateForm]);
    setShowDateModal(false);
    setDateForm({ title: "", date: "", icon: "❤️" });
    await fetchData();
  };

  const handleDeleteDate = async (id) => {
    if (!window.confirm("Delete this date?")) return;
    await supabase.from("important_dates").delete().eq("id", id);
    await fetchData();
  };

  const filtered = filterType === "all" ? memories : memories.filter(m => m.type === filterType);
  const getMoodEmoji = (mood) => MOODS.find(m => m.value === mood)?.emoji || "😊";
  const getTypeInfo = (type) => TYPES.find(t => t.value === type) || TYPES[0];

  // Next important date
  const today = new Date();
  const upcomingDate = importantDates
    .map(d => {
      const date = new Date(d.date);
      const thisYear = new Date(today.getFullYear(), date.getMonth(), date.getDate());
      if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
      return { ...d, next: thisYear, daysLeft: Math.ceil((thisYear - today) / 86400000) };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a0a0f 0%, #2d1420 50%, #1a0a1a 100%)" }}>
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <Heart size={48} className="text-rose-400" fill="currentColor" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{
      background: "linear-gradient(135deg, #0d0508 0%, #1f0d16 40%, #150d1f 80%, #0d0810 100%)",
      fontFamily: "'Georgia', serif"
    }}>
      {/* Floating hearts background */}
      {[...Array(12)].map((_, i) => (
        <FloatingHeart key={i} style={{
          left: `${(i * 8.3) % 100}%`,
          top: `${20 + (i * 13) % 60}%`,
          fontSize: `${16 + (i % 3) * 8}px`,
        }} />
      ))}

      {/* Grain texture overlay */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "200px",
      }} />

      {/* ══════════════ NAVIGATION ══════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4" style={{ background: "rgba(13,5,8,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(244,63,94,0.1)" }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-2 cursor-pointer" onClick={() => setView("home")}>
            <Heart size={22} className="text-rose-400" fill="currentColor" />
            <span className="text-rose-200 font-bold text-lg tracking-wide" style={{ fontFamily: "'Georgia', serif" }}>Our Story</span>
          </motion.div>

          <div className="flex items-center gap-1">
            {[
              { id: "home", icon: Heart, label: "Home" },
              { id: "memories", icon: BookOpen, label: "Memories" },
              { id: "dates", icon: Calendar, label: "Dates" },
            ].map((item) => (
              <button key={item.id} onClick={() => setView(item.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${view === item.id
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "text-rose-200/50 hover:text-rose-200/80 hover:bg-white/5"}`}>
                <item.icon size={15} />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="pt-20 pb-10 px-4 max-w-4xl mx-auto">

        {/* ══════════════ HOME VIEW ══════════════ */}
        {view === "home" && (
          <div className="space-y-8">

            {/* Hero Counter */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
              className="text-center py-16 relative">
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 rounded-3xl opacity-20"
                style={{ background: "radial-gradient(ellipse at center, #f43f5e 0%, transparent 70%)" }} />

              <p className="text-rose-300/60 text-sm font-semibold uppercase tracking-[0.3em] mb-4">Together since May 2, 2025</p>

              <div className="relative inline-block">
                <motion.div
                  key={days}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-[120px] font-black leading-none"
                  style={{
                    background: "linear-gradient(135deg, #fda4af, #f43f5e, #fb7185)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    fontFamily: "'Georgia', serif",
                    textShadow: "none",
                    filter: "drop-shadow(0 0 40px rgba(244,63,94,0.3))"
                  }}>
                  {days}
                </motion.div>
                <p className="text-rose-200/60 text-2xl font-light tracking-widest mt-2">days of us</p>
              </div>

              <div className="flex items-center justify-center gap-8 mt-10">
                {[
                  { value: Math.floor(days / 7), label: "weeks" },
                  { value: Math.floor(days / 30), label: "months" },
                  { value: memories.length, label: "memories" },
                ].map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                    className="text-center">
                    <p className="text-3xl font-black text-rose-300">{s.value}</p>
                    <p className="text-rose-300/40 text-xs uppercase tracking-widest mt-1">{s.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Next Important Date */}
            {upcomingDate && (
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, rgba(244,63,94,0.15), rgba(251,113,133,0.05))", border: "1px solid rgba(244,63,94,0.2)" }}>
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10"
                  style={{ background: "radial-gradient(circle, #f43f5e, transparent)", transform: "translate(30%, -30%)" }} />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-rose-300/50 text-xs uppercase tracking-widest mb-1">Next Special Day</p>
                    <p className="text-rose-100 text-xl font-bold">{upcomingDate.icon} {upcomingDate.title}</p>
                    <p className="text-rose-300/60 text-sm mt-1">{new Date(upcomingDate.date).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-5xl font-black text-rose-400">{upcomingDate.daysLeft}</p>
                    <p className="text-rose-300/50 text-xs uppercase tracking-widest">days left</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Recent Memories */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-rose-200/80 font-bold text-lg flex items-center gap-2">
                  <Sparkles size={18} className="text-rose-400" />Recent Memories
                </h2>
                <button onClick={() => setView("memories")} className="text-rose-400/60 text-sm hover:text-rose-400 transition-colors">View all →</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {memories.slice(0, 4).map((m, i) => {
                  const typeInfo = getTypeInfo(m.type);
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      onClick={() => setSelectedMemory(m)}
                      className="rounded-2xl overflow-hidden cursor-pointer relative group"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(244,63,94,0.12)" }}>
                      {m.image_url && (
                        <div className="h-40 overflow-hidden">
                          <img src={m.image_url} alt={m.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </div>
                      )}
                      <div className={`p-4 ${m.image_url ? 'absolute bottom-0 left-0 right-0' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}>
                            {m.type}
                          </span>
                          <span className="text-sm">{getMoodEmoji(m.mood)}</span>
                        </div>
                        <p className="text-rose-100 font-bold truncate">{m.title}</p>
                        <p className="text-rose-300/50 text-xs mt-0.5">{new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Add Memory FAB */}
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setEditingMemory(null); setForm({ title: "", description: "", date: "", type: "moment", mood: "happy", imageFile: null, image_url: "" }); setShowModal(true); }}
              className="fixed bottom-8 right-8 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl z-40"
              style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)", boxShadow: "0 0 30px rgba(244,63,94,0.4)" }}>
              <Plus size={28} className="text-white" />
            </motion.button>
          </div>
        )}

        {/* ══════════════ MEMORIES VIEW ══════════════ */}
        {view === "memories" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-black text-rose-200" style={{ fontFamily: "'Georgia', serif" }}>Our Memories</h1>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => { setEditingMemory(null); setForm({ title: "", description: "", date: "", type: "moment", mood: "happy", imageFile: null, image_url: "" }); setShowModal(true); }}
                className="px-5 py-2.5 rounded-xl font-bold text-white flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)" }}>
                <Plus size={18} />Add Memory
              </motion.button>
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 flex-wrap">
              {[{ value: "all", label: "All", icon: "✨" }, ...TYPES.map(t => ({ value: t.value, label: t.label, icon: t.value === "moment" ? "❤️" : t.value === "milestone" ? "⭐" : t.value === "photo" ? "📸" : "📅" }))].map((f) => (
                <button key={f.value} onClick={() => setFilterType(f.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filterType === f.value
                    ? "text-white shadow-lg" : "text-rose-300/50 hover:text-rose-300/80"}`}
                  style={filterType === f.value ? { background: "linear-gradient(135deg, #f43f5e, #e11d48)", boxShadow: "0 4px 15px rgba(244,63,94,0.3)" } : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(244,63,94,0.1)" }}>
                  {f.icon} {f.label} {f.value === "all" ? `(${memories.length})` : `(${memories.filter(m => m.type === f.value).length})`}
                </button>
              ))}
            </div>

            {/* Memories Grid */}
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <Heart size={48} className="mx-auto text-rose-400/30 mb-4" />
                <p className="text-rose-300/40 text-lg">No memories yet — add your first one! 💕</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((m, i) => {
                  const typeInfo = getTypeInfo(m.type);
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                      whileHover={{ y: -6 }}
                      onClick={() => setSelectedMemory(m)}
                      className="rounded-2xl overflow-hidden cursor-pointer group relative"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(244,63,94,0.12)" }}>

                      {m.image_url ? (
                        <div className="h-48 overflow-hidden relative">
                          <img src={m.image_url} alt={m.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                          <div className="absolute top-3 left-3">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm" style={{ background: `${typeInfo.color}30`, color: typeInfo.color, border: `1px solid ${typeInfo.color}40` }}>
                              {m.type}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-24 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${typeInfo.color}15, ${typeInfo.color}05)` }}>
                          <span className="text-4xl">{getMoodEmoji(m.mood)}</span>
                        </div>
                      )}

                      <div className="p-4">
                        <p className="text-rose-100 font-bold truncate text-lg">{m.title}</p>
                        {m.description && <p className="text-rose-300/50 text-sm mt-1 line-clamp-2">{m.description}</p>}
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-rose-300/40 text-xs flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <span className="text-lg">{getMoodEmoji(m.mood)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ DATES VIEW ══════════════ */}
        {view === "dates" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-black text-rose-200" style={{ fontFamily: "'Georgia', serif" }}>Important Dates</h1>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowDateModal(true)}
                className="px-5 py-2.5 rounded-xl font-bold text-white flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)" }}>
                <Plus size={18} />Add Date
              </motion.button>
            </div>

            {importantDates.length === 0 ? (
              <div className="text-center py-20">
                <Calendar size={48} className="mx-auto text-rose-400/30 mb-4" />
                <p className="text-rose-300/40 text-lg">No important dates yet 📅</p>
              </div>
            ) : (
              <div className="space-y-3">
                {importantDates.map((d, i) => {
                  const date = new Date(d.date);
                  const thisYear = new Date(today.getFullYear(), date.getMonth(), date.getDate());
                  if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
                  const daysLeft = Math.ceil((thisYear - today) / 86400000);
                  const isPast = daysLeft > 300;

                  return (
                    <motion.div key={d.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-5 rounded-2xl group"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(244,63,94,0.12)" }}>
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{d.icon}</span>
                        <div>
                          <p className="text-rose-100 font-bold">{d.title}</p>
                          <p className="text-rose-300/50 text-sm">{new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-black text-rose-400">{daysLeft === 0 ? "🎉" : daysLeft}</p>
                          <p className="text-rose-300/40 text-xs">{daysLeft === 0 ? "Today!" : "days left"}</p>
                        </div>
                        <button onClick={() => handleDeleteDate(d.id)}
                          className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-xl transition-all">
                          <Trash2 size={15} className="text-red-400" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════ MEMORY DETAIL MODAL ══════════════ */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}
            onClick={() => setSelectedMemory(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl overflow-hidden w-full max-w-lg max-h-[90vh] flex flex-col"
              style={{ background: "linear-gradient(135deg, #1a0a0f, #2d1420)", border: "1px solid rgba(244,63,94,0.2)" }}>
              {selectedMemory.image_url && (
                <div className="h-64 overflow-hidden">
                  <img src={selectedMemory.image_url} alt={selectedMemory.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 overflow-y-auto">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${getTypeInfo(selectedMemory.type).color}20`, color: getTypeInfo(selectedMemory.type).color }}>
                      {selectedMemory.type}
                    </span>
                    <span className="text-xl">{getMoodEmoji(selectedMemory.mood)}</span>
                  </div>
                  <button onClick={() => setSelectedMemory(null)} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
                    <X size={20} className="text-rose-300/60" />
                  </button>
                </div>
                <h2 className="text-2xl font-black text-rose-100 mb-2" style={{ fontFamily: "'Georgia', serif" }}>{selectedMemory.title}</h2>
                <p className="text-rose-300/50 text-sm mb-4 flex items-center gap-2">
                  <Calendar size={13} />
                  {new Date(selectedMemory.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                {selectedMemory.description && (
                  <p className="text-rose-200/70 leading-relaxed mb-6 italic">"{selectedMemory.description}"</p>
                )}
                <div className="flex gap-3">
                  <button onClick={() => {
                    setEditingMemory(selectedMemory);
                    setForm({ title: selectedMemory.title, description: selectedMemory.description, date: selectedMemory.date, type: selectedMemory.type, mood: selectedMemory.mood, imageFile: null, image_url: selectedMemory.image_url });
                    setSelectedMemory(null);
                    setShowModal(true);
                  }} className="flex-1 py-3 rounded-xl font-bold text-rose-300 flex items-center justify-center gap-2 transition-colors hover:bg-white/10"
                    style={{ border: "1px solid rgba(244,63,94,0.2)" }}>
                    <Edit2 size={16} />Edit
                  </button>
                  <button onClick={() => handleDeleteMemory(selectedMemory.id)}
                    className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <Trash2 size={16} />Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════ ADD/EDIT MEMORY MODAL ══════════════ */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}
            onClick={() => !uploading && setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl overflow-hidden w-full max-w-lg max-h-[90vh] flex flex-col"
              style={{ background: "linear-gradient(135deg, #1a0a0f, #2d1420)", border: "1px solid rgba(244,63,94,0.2)" }}>

              <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(244,63,94,0.1)" }}>
                <h3 className="text-xl font-black text-rose-200" style={{ fontFamily: "'Georgia', serif" }}>
                  {editingMemory ? "Edit Memory" : "New Memory ✨"}
                </h3>
                <button onClick={() => !uploading && setShowModal(false)} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={20} className="text-rose-300/60" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-rose-300/60 uppercase tracking-wider mb-1.5 block">Title *</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Name this memory..."
                    className="w-full px-4 py-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(244,63,94,0.15)", color: "#fce7f3" }} />
                </div>

                {/* Date */}
                <div>
                  <label className="text-xs font-bold text-rose-300/60 uppercase tracking-wider mb-1.5 block">Date *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(244,63,94,0.15)", color: "#fce7f3", colorScheme: "dark" }} />
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs font-bold text-rose-300/60 uppercase tracking-wider mb-1.5 block">Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {TYPES.map((t) => (
                      <button key={t.value} onClick={() => setForm({ ...form, type: t.value })}
                        className="py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1"
                        style={form.type === t.value
                          ? { background: `${t.color}25`, border: `1px solid ${t.color}60`, color: t.color }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(252,231,243,0.4)" }}>
                        <t.icon size={16} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood */}
                <div>
                  <label className="text-xs font-bold text-rose-300/60 uppercase tracking-wider mb-1.5 block">Mood</label>
                  <div className="flex gap-2 flex-wrap">
                    {MOODS.map((m) => (
                      <button key={m.value} onClick={() => setForm({ ...form, mood: m.value })}
                        className="px-3 py-2 rounded-xl text-sm transition-all"
                        style={form.mood === m.value
                          ? { background: "rgba(244,63,94,0.2)", border: "1px solid rgba(244,63,94,0.4)" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {m.emoji} <span className="text-xs text-rose-300/60 ml-1">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-rose-300/60 uppercase tracking-wider mb-1.5 block">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Tell the story..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl font-medium outline-none focus:ring-2 focus:ring-rose-500/50 transition-all resize-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(244,63,94,0.15)", color: "#fce7f3" }} />
                </div>

                {/* Photo */}
                <div>
                  <label className="text-xs font-bold text-rose-300/60 uppercase tracking-wider mb-1.5 block">Photo</label>
                  <div className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer`}
                    style={{ borderColor: form.imageFile ? "rgba(244,63,94,0.6)" : "rgba(244,63,94,0.15)", background: form.imageFile ? "rgba(244,63,94,0.05)" : "transparent" }}>
                    <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, imageFile: e.target.files[0] })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {form.imageFile ? (
                      <div className="flex items-center justify-center gap-2 text-rose-400">
                        <ImageIcon size={16} />
                        <span className="text-sm font-bold">{form.imageFile.name}</span>
                      </div>
                    ) : form.image_url ? (
                      <div className="flex items-center justify-center gap-2 text-rose-300/60">
                        <ImageIcon size={16} />
                        <span className="text-sm">Current photo — click to replace</span>
                      </div>
                    ) : (
                      <div className="text-rose-300/40">
                        <Camera size={24} className="mx-auto mb-1" />
                        <p className="text-sm">Upload a photo</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4" style={{ borderTop: "1px solid rgba(244,63,94,0.1)" }}>
                <button onClick={handleSaveMemory} disabled={uploading || !form.title || !form.date}
                  className="w-full py-3.5 rounded-xl font-black text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)", boxShadow: "0 4px 20px rgba(244,63,94,0.3)" }}>
                  {uploading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                  ) : (
                    <><Heart size={18} fill="currentColor" />{editingMemory ? "Update Memory" : "Save Memory"}</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════ ADD DATE MODAL ══════════════ */}
      <AnimatePresence>
        {showDateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}
            onClick={() => setShowDateModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl w-full max-w-md overflow-hidden"
              style={{ background: "linear-gradient(135deg, #1a0a0f, #2d1420)", border: "1px solid rgba(244,63,94,0.2)" }}>
              <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(244,63,94,0.1)" }}>
                <h3 className="text-xl font-black text-rose-200">Add Important Date 📅</h3>
                <button onClick={() => setShowDateModal(false)} className="p-1.5 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={20} className="text-rose-300/60" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <input type="text" value={dateForm.title} onChange={(e) => setDateForm({ ...dateForm, title: e.target.value })}
                  placeholder="e.g., Our Anniversary, First Date..."
                  className="w-full px-4 py-3 rounded-xl font-medium outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(244,63,94,0.15)", color: "#fce7f3" }} />
                <input type="date" value={dateForm.date} onChange={(e) => setDateForm({ ...dateForm, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl font-medium outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(244,63,94,0.15)", color: "#fce7f3", colorScheme: "dark" }} />
                <div>
                  <label className="text-xs font-bold text-rose-300/60 uppercase tracking-wider mb-2 block">Icon</label>
                  <div className="grid grid-cols-6 gap-2">
                    {DATE_ICONS.map((icon) => (
                      <button key={icon} onClick={() => setDateForm({ ...dateForm, icon })}
                        className="text-2xl py-2 rounded-xl transition-all"
                        style={dateForm.icon === icon ? { background: "rgba(244,63,94,0.2)", border: "1px solid rgba(244,63,94,0.4)" } : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleSaveDate} disabled={!dateForm.title || !dateForm.date}
                  className="w-full py-3.5 rounded-xl font-black text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #f43f5e, #e11d48)" }}>
                  Save Date
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}