import React, { useState, useEffect, useRef } from "react";
import { CheckCircleIcon, UserCircleIcon, ArrowPathIcon, MoonIcon, SunIcon, ArrowRightIcon, ClipboardDocumentIcon } from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { toast, ToastContainer } from "react-toastify";
import { QRCodeSVG } from "qrcode.react";
import Confetti from "react-confetti";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Slider from "react-slick";
import { FaRegChartBar, FaWallet, FaHistory, FaUserCheck, FaSmile, FaCreditCard } from "react-icons/fa";
import 'react-toastify/dist/ReactToastify.css';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// ----------- Helper API -----------
const API_URL = "http://localhost:3000";
const fetchWithAuth = (url, options = {}) => {
  const token = localStorage.getItem("token");
  return fetch(API_URL + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { "Authorization": "Bearer " + token } : {})
    }
  });
};

// ----------- Login & Signup -----------
function Signup({ setPage }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    const res = await fetch(API_URL + "/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      toast.success("Signup successful! Please login.");
      setPage("login");
    } else {
      const err = await res.json();
      setError(err.error || "Signup failed");
    }
  };
  return (
    <motion.div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-700 to-cyan-400"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="bg-white/90 p-10 rounded-2xl shadow-2xl w-full max-w-sm">
        <h2 className="text-2xl font-extrabold mb-4 text-purple-700 text-center">Create Your Account</h2>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required className="p-3 rounded-xl border border-purple-300" />
          <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="Email" required className="p-3 rounded-xl border border-purple-300" />
          <input name="password" value={form.password} onChange={handleChange} type="password" placeholder="Password" required className="p-3 rounded-xl border border-purple-300" />
          <button type="submit" className="py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold shadow-lg mt-2 hover:scale-105 transition">Signup</button>
        </form>
        {error && <div className="text-red-500 mt-2 text-center">{error}</div>}
        <div className="mt-3 text-blue-700 text-center cursor-pointer underline" onClick={() => setPage("login")}>Already have an account? Login</div>
      </div>
      <ToastContainer position="top-right" />
    </motion.div>
  );
}

function Login({ setUser, setPage }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    const res = await fetch(API_URL + "/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("token", data.token);
      setUser({ name: data.name, email: data.email });
    } else {
      const err = await res.json();
      setError(err.error || "Login failed");
    }
  };
  return (
    <motion.div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-700 to-cyan-400"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="bg-white/90 p-10 rounded-2xl shadow-2xl w-full max-w-sm">
        <h2 className="text-2xl font-extrabold mb-4 text-purple-700 text-center">Login to SwiftGuardPay</h2>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <input name="email" value={form.email} onChange={handleChange} type="email" placeholder="Email" required className="p-3 rounded-xl border border-purple-300" />
          <input name="password" value={form.password} onChange={handleChange} type="password" placeholder="Password" required className="p-3 rounded-xl border border-purple-300" />
          <button type="submit" className="py-3 rounded-xl bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold shadow-lg mt-2 hover:scale-105 transition">Login</button>
        </form>
        {error && <div className="text-red-500 mt-2 text-center">{error}</div>}
        <div className="mt-3 text-purple-700 text-center cursor-pointer underline" onClick={() => setPage("signup")}>New user? Signup</div>
      </div>
      <ToastContainer position="top-right" />
    </motion.div>
  );
}

// ----------- Main Animated App -----------
const COLORS = ["#6D28D9", "#0891B2", "#EA580C"];
const TABS = [
  { label: "Dashboard", icon: <FaRegChartBar size={22}/> },
  { label: "Payment", icon: <FaCreditCard size={22}/> },
  { label: "Transactions", icon: <FaHistory size={22}/> },
  { label: "Analytics", icon: <FaWallet size={22}/> },
  { label: "Testimonials", icon: <FaSmile size={22}/> },
  { label: "Profile", icon: <FaUserCheck size={22}/> }
];

function MainApp({ user, onLogout }) {
  const [tab, setTab] = useState(0);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CARD");
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("light");
  const [txns, setTxns] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const sliderRef = useRef();

  // Fetch user's payments on mount/login
  useEffect(() => {
    fetchWithAuth("/payments")
      .then(res => res.json())
      .then(data => setTxns(data.reverse()))
      .catch(() => setTxns([]));
  }, []);

  function toggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
    document.body.className = theme === "light" ? "dark" : "";
  }

  // Analytics
  const totalPaid = txns.filter(x=>x.status==="SUCCESS").reduce((a,b)=>a+parseInt(b.amount),0);
  const totalFailed = txns.filter(x=>x.status==="FAILED").length;
  const totalPending = txns.filter(x=>x.status==="PENDING").length;
  const lastTxn = txns.length ? txns[0].amount : "--";

  // Payment
  const handlePay = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPaymentStatus(null);
    const res = await fetchWithAuth("/payments", {
      method: "POST",
      body: JSON.stringify({
        amount: parseInt(amount),
        method,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setPaymentStatus(data);
      setTxns([data, ...txns]);
      setAmount("");
      toast.success("Payment processed! Status: " + data.status);
      if(data.status==="SUCCESS") setShowConfetti(true);
      setTimeout(()=>setShowConfetti(false), 2500);
    } else {
      toast.error("Payment failed");
    }
    setLoading(false);
  };

  function copyId(id) {
    navigator.clipboard.writeText(id);
    toast("Transaction ID copied!");
  }

  // PDF
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("SwiftGuardPay - Bank Statement", 14, 18);
    doc.text(`Account Holder: ${user.name}`, 14, 26);
    doc.text(`Email: ${user.email}`, 14, 33);
    doc.autoTable({
      startY: 40,
      head: [["Txn ID", "Amount", "Method", "Date", "Status"]],
      body: txns.slice(0,10).map(txn=>[txn.id, txn.amount, txn.method, txn.date, txn.status])
    });
    doc.save("SwiftGuardPay_Statement.pdf");
  };

  const testimonials = [
    {
      name: "Amit Sharma",
      text: "SwiftGuardPay made online payments so smooth! Design is absolutely next level.",
      img: "https://randomuser.me/api/portraits/men/31.jpg"
    },
    {
      name: "Shreya Singh",
      text: "Payment analytics and PDF bank statement are just chef’s kiss. Best payment demo app.",
      img: "https://randomuser.me/api/portraits/women/45.jpg"
    },
    {
      name: "Rahul Jain",
      text: "Superb! The UI animations and QR Pay are recruiter-level impressive. Bhawna rocks!",
      img: "https://randomuser.me/api/portraits/men/68.jpg"
    }
  ];

  // ---- SectionContent ----
  function SectionContent() {
    switch(tab) {
      case 0: // Dashboard
        return (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.7}}>
            <div className="flex flex-wrap gap-6 justify-center mt-7 z-10">
              <motion.div whileHover={{scale:1.08}} className="p-6 rounded-xl shadow bg-gradient-to-br from-purple-400 via-cyan-200 to-white min-w-[190px] text-center">
                <div className="text-xl font-bold text-purple-800">Total Paid</div>
                <div className="text-3xl font-extrabold text-green-700 mt-2">₹ {totalPaid}</div>
              </motion.div>
              <motion.div whileHover={{scale:1.08}} className="p-6 rounded-xl shadow bg-gradient-to-br from-red-300 via-yellow-100 to-white min-w-[190px] text-center">
                <div className="text-xl font-bold text-red-700">Failed</div>
                <div className="text-3xl font-extrabold text-red-600 mt-2">{totalFailed}</div>
              </motion.div>
              <motion.div whileHover={{scale:1.08}} className="p-6 rounded-xl shadow bg-gradient-to-br from-yellow-200 via-cyan-100 to-white min-w-[190px] text-center">
                <div className="text-xl font-bold text-yellow-700">Pending</div>
                <div className="text-3xl font-extrabold text-yellow-700 mt-2">{totalPending}</div>
              </motion.div>
              <motion.div whileHover={{scale:1.08}} className="p-6 rounded-xl shadow bg-gradient-to-br from-cyan-200 via-purple-100 to-white min-w-[190px] text-center">
                <div className="text-xl font-bold text-cyan-700">Last Payment</div>
                <div className="text-2xl font-extrabold text-cyan-700 mt-2">₹ {lastTxn}</div>
              </motion.div>
              <motion.button whileHover={{scale:1.08}} onClick={downloadPDF} className="p-6 rounded-xl shadow bg-gradient-to-br from-green-200 via-white to-cyan-100 min-w-[190px] text-center font-bold text-cyan-900 border-2 border-cyan-400">⬇ Bank Statement (PDF)</motion.button>
            </div>
            <div className="flex justify-center mt-12">
              <img src="https://cdn.dribbble.com/users/1615584/screenshots/4650174/payment_cards.png" className="w-[420px] rounded-2xl shadow-xl border-2 border-cyan-200" alt="dashboard graphic"/>
            </div>
          </motion.div>
        );
      case 1: // Payment
        return (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.7}} className="flex flex-col items-center">
            <motion.div initial={{ y: 40, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", duration: 1, bounce: 0.2 }} className="w-full max-w-lg bg-white/60 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 mt-8 border border-white/30">
              <h2 className="text-3xl font-bold text-purple-800 dark:text-cyan-400 mb-7 text-center tracking-tight drop-shadow">Send Payment</h2>
              <form onSubmit={handlePay} className="space-y-5">
                <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}>
                  <label className="block text-base font-medium mb-1 text-purple-800 dark:text-cyan-200">Amount (INR)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-xl border-2 border-purple-300 bg-white/70 dark:bg-slate-800 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400 text-lg"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    disabled={loading}
                  />
                </motion.div>
                <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}>
                  <label className="block text-base font-medium mb-1 text-purple-800 dark:text-cyan-200">Payment Method</label>
                  <select
                    className="w-full rounded-xl border-2 border-purple-300 bg-white/70 dark:bg-slate-800 px-4 py-3 text-lg"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    disabled={loading}
                  >
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="NETBANKING">NetBanking</option>
                  </select>
                </motion.div>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-extrabold text-lg shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-cyan-300 active:scale-95 transition mt-3"
                >
                  {loading ? (
                    <span className="flex gap-2 items-center justify-center">
                      <ArrowPathIcon className="w-6 h-6 animate-spin" /> Processing...
                    </span>
                  ) : (
                    "Pay Now"
                  )}
                </motion.button>
              </form>
              {/* Payment status animation */}
              <AnimatePresence>
                {paymentStatus && (
                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ type: "spring", duration: 0.7, bounce: 0.2 }} className="mt-8 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-200 via-green-50 to-cyan-100 rounded-2xl shadow">
                    <CheckCircleIcon className="h-14 w-14 text-green-600 mb-2 animate-bounce" />
                    <div className="font-bold text-xl text-green-800 mb-1">Payment Status: {paymentStatus.status}</div>
                    <div className="text-xs text-gray-700 mb-2 flex items-center gap-1">
                      Txn ID: <span className="font-mono">{paymentStatus.id}</span>
                      <ClipboardDocumentIcon onClick={()=>copyId(paymentStatus.id)} className="w-5 h-5 text-blue-600 cursor-pointer" title="Copy TxnID" />
                    </div>
                    <button className="bg-blue-400 rounded-lg px-3 py-1 font-semibold text-white mt-2 hover:scale-105" onClick={()=>setShowQR(true)}>
                      Show QR Code
                    </button>
                    <AnimatePresence>
                      {showQR && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
                          <QRCodeSVG value={paymentStatus.id} size={140} bgColor="#f4f4f4" fgColor="#3b0764"/>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        );
      case 2: // Transactions
        return (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.7}}>
            <div className="max-w-3xl mx-auto">
              <div className="font-bold text-lg mb-2 text-purple-700 dark:text-cyan-200">Recent Transactions</div>
              <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl shadow-lg">
                <div className="flex px-5 py-2 font-semibold border-b border-purple-100 dark:border-cyan-700 text-xs gap-2">
                  <span>Status</span>
                  <span>Amount</span>
                  <span>Method</span>
                  <span className="ml-auto">Date</span>
                  <span className="ml-6">Txn ID</span>
                </div>
                {txns.length === 0 && (
                  <div className="px-5 py-6 text-gray-400 text-center">No transactions yet.</div>
                )}
                {txns.map((txn) => (
                  <div key={txn.id} className="flex items-center gap-2 px-5 py-3 border-b border-purple-50 dark:border-cyan-900 text-sm">
                    <span>{txn.status === "SUCCESS" ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : txn.status === "FAILED" ? <span className="w-5 h-5 text-red-500">❌</span> : <span className="w-5 h-5 text-yellow-500">⏳</span>}</span>
                    <span className="font-semibold text-lg">{txn.amount} INR</span>
                    <span>{txn.method}</span>
                    <span className="ml-auto font-bold">{txn.status}</span>
                    <span className="ml-6 text-xs text-gray-500">{txn.date ? txn.date.slice(0,10) : "--"}</span>
                    <ClipboardDocumentIcon onClick={()=>copyId(txn.id)} className="w-5 h-5 text-blue-600 cursor-pointer" title="Copy TxnID" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      case 3: // Analytics
        // Simple analytics for last 7 days + method pie chart
        const today = new Date();
        const getDateStr = (d) => d.toISOString().slice(5,10);
        const dayArr = Array.from({length:7},(_,i)=>{
          const dt = new Date(today); dt.setDate(dt.getDate()-i);
          return {date: getDateStr(dt), amt: 0};
        }).reverse();
        txns.forEach(txn=>{
          const idx = dayArr.findIndex(d=>txn.date && txn.date.slice(5,10)===d.date);
          if(idx!==-1) dayArr[idx].amt += parseInt(txn.amount);
        });
        const paymentsByMethod = [
          {name: "Card", value: txns.filter(x=>x.method==="CARD").length},
          {name: "UPI", value: txns.filter(x=>x.method==="UPI").length},
          {name: "NetBanking", value: txns.filter(x=>x.method==="NETBANKING").length}
        ];
        return (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.7}} className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="font-bold text-lg text-purple-700 dark:text-cyan-200">Payments Analytics (Last 7 days)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dayArr}>
                    <XAxis dataKey="date" stroke="#8884d8" />
                    <YAxis stroke="#8884d8" />
                    <Tooltip />
                    <Bar dataKey="amt" fill="#8b5cf6" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="font-bold text-lg text-purple-700 dark:text-cyan-200">Payments by Method</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={paymentsByMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} fill="#8884d8" label>
                      {paymentsByMethod.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        );
      case 4: // Testimonials
        return (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.7}} className="w-full max-w-4xl mx-auto">
            <div className="font-bold text-2xl text-center text-purple-700 dark:text-cyan-200 mb-6">What our users say</div>
            <Slider
              ref={sliderRef}
              dots={true}
              infinite={true}
              speed={400}
              slidesToShow={1}
              slidesToScroll={1}
              arrows={false}
              autoplay={true}
              autoplaySpeed={4000}
              className="rounded-xl"
            >
              {testimonials.map((t, i) => (
                <div key={i} className="flex flex-col items-center gap-4 bg-white/90 dark:bg-slate-900/70 rounded-xl py-8 px-4 shadow-lg">
                  <img src={t.img} className="w-20 h-20 rounded-full border-4 border-purple-400" alt={t.name}/>
                  <div className="font-semibold text-xl">{t.name}</div>
                  <div className="text-gray-700 dark:text-cyan-100 text-center max-w-xl">{t.text}</div>
                </div>
              ))}
            </Slider>
          </motion.div>
        );
      case 5: // Profile
        return (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.7}} className="flex flex-col items-center gap-8 bg-white/80 dark:bg-slate-900/80 rounded-2xl p-8 max-w-lg mx-auto shadow">
            <UserCircleIcon className="w-24 h-24 text-purple-500" />
            <div className="font-extrabold text-2xl">{user.name}</div>
            <div className="text-gray-500">{user.email}</div>
          </motion.div>
        );
      default:
        return null;
    }
  }

  // ---- Main Animated UI Layout ----
  return (
    <div className={`min-h-screen flex flex-col ${theme === "dark" ? "bg-gradient-to-br from-gray-900 via-indigo-900 to-slate-800" : "bg-gradient-to-tr from-blue-900 via-purple-600 to-cyan-400"} transition duration-500`}>
      {showConfetti && <Confetti numberOfPieces={220} recycle={false} />}
      {/* Animated Blobs */}
      <motion.div className="fixed w-[450px] h-[450px] bg-purple-400 rounded-full blur-3xl opacity-30 left-[-150px] top-[-200px] z-0" animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }} />
      <motion.div className="fixed w-[300px] h-[300px] bg-cyan-400 rounded-full blur-3xl opacity-25 right-[-70px] bottom-[-100px] z-0" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }} />
      {/* Navbar */}
      <div className="z-10 py-5 px-6 flex justify-between items-center">
        <span className="flex items-center gap-2 text-2xl font-bold text-white drop-shadow">
          <img src="https://cdn-icons-png.flaticon.com/512/891/891419.png" className="w-9 h-9" alt="logo"/>
          <span className="bg-gradient-to-r from-purple-500 to-cyan-400 px-3 py-1 rounded-xl shadow text-white">SwiftGuardPay</span>
        </span>
        <div className="flex gap-4 items-center">
          <button title="Toggle theme" onClick={toggleTheme} className="hover:scale-125 transition">
            {theme==="dark" ? <SunIcon className="w-7 h-7 text-yellow-300"/> : <MoonIcon className="w-7 h-7 text-blue-900"/>}
          </button>
          <span className="font-semibold text-white mr-4">{user.name}</span>
          <button onClick={onLogout} className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold shadow hover:bg-red-600">Logout</button>
        </div>
      </div>
      {/* Tabs */}
      <div className="flex justify-center gap-2 mt-4 mb-2 z-20">
        {TABS.map((tabObj, idx) => (
          <button key={tabObj.label} onClick={()=>setTab(idx)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-md transition ${tab===idx ? "bg-white/90 text-purple-700 shadow-xl" : "bg-white/40 text-purple-900 hover:bg-white/70"}`}>
            {tabObj.icon}
            {tabObj.label}
          </button>
        ))}
      </div>
      {/* Section Content */}
      <main className="flex-1 flex flex-col justify-center px-2 py-4 z-10">
        <SectionContent />
      </main>
      {/* Footer */}
      <footer className="z-10 text-center py-4 text-gray-700 dark:text-cyan-100 text-xs">
        Made with ❤️ by Bhawna | SwiftGuardPay v2.0 | Recruiter Demo Project
      </footer>
      <ToastContainer position="top-right" />
    </div>
  );
}

// ----------- Master App -----------
function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("login");

  // Check login
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchWithAuth("/me")
        .then(res => res.ok ? res.json() : null)
        .then(data => data && setUser({ name: data.name, email: data.email }))
        .catch(() => setUser(null));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setPage("login");
  };

  if (!user) {
    if (page === "signup") return <Signup setPage={setPage} />;
    return <Login setUser={setUser} setPage={setPage} />;
  }

  return <MainApp user={user} onLogout={handleLogout} />;
}

export default App;
