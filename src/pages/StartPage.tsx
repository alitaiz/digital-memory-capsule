
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMemoriesContext } from '../App';
import { SparkleIcon } from '../components/ui';

const StartPage = () => {
  const { getAllSlugs } = useMemoriesContext();
  const navigate = useNavigate();
  const [recoverCode, setRecoverCode] = useState('');
  const [allSlugs, setAllSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slugs = getAllSlugs();
    setAllSlugs(slugs);
    // If user has only ever created or visited one memory on this device, redirect them
    if (slugs.length === 1) {
      // Use replace to avoid the user being able to click "back" to this page
      navigate(`/memory/${slugs[0]}`, { replace: true });
    } else {
      setLoading(false);
    }
  // The dependency array is carefully constructed to only run this once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecoverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoverCode.trim()) {
      navigate(`/memory/${recoverCode.trim()}`);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><SparkleIcon className="animate-spin w-12 h-12 text-sky-500"/></div>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-yellow-50">
      <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{backgroundImage: "url('https://www.toptal.com/designers/subtlepatterns/uploads/squares.png')"}}></div>
      <div className="relative container mx-auto px-6 py-24 text-center">
        {allSlugs.length > 0 ? (
          <div className="bg-white/60 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-2xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-800">Welcome back! ✨</h1>
            <p className="mt-4 text-slate-600">Ready to relive some moments? Your created and visited memories are waiting.</p>
            <div className="mt-6">
                <Link to="/list" className="bg-sky-500 text-white font-semibold py-2 px-5 rounded-full hover:bg-sky-600 transition-colors">View Your Memories</Link>
            </div>
            <div className="mt-8">
              <Link to="/create" className="bg-amber-500 text-white font-bold py-3 px-6 rounded-full hover:bg-amber-600 transition-transform duration-300 inline-block transform hover:scale-105">
                🎁 Create a New Memory
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-800">
              Capture a moment. Create a gift. Share a memory. 🎁
            </h1>
            <p className="mt-6 text-lg text-slate-700">
              Build a beautiful digital time capsule for friends and family to cherish forever.
            </p>
            <Link to="/create" className="mt-10 inline-block bg-amber-500 text-white font-bold py-4 px-8 rounded-full hover:bg-amber-600 transition-transform duration-300 text-lg transform hover:scale-105">
              Create a Digital Gift
            </Link>
          </div>
        )}
         <div className="mt-12 max-w-md mx-auto">
            <form onSubmit={handleRecoverSubmit} className="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-lg">
              <label htmlFor="recover-code" className="font-serif text-slate-700">Have a memory code?</label>
              <div className="mt-2 flex space-x-2">
                <input
                  id="recover-code"
                  type="text"
                  value={recoverCode}
                  onChange={(e) => setRecoverCode(e.target.value)}
                  placeholder="e.g., surprise-party-24"
                  className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-sky-500 focus:border-sky-500"
                />
                <button type="submit" className="bg-sky-500 text-white p-2 rounded-full hover:bg-sky-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
              </div>
            </form>
          </div>
      </div>
    </div>
  );
};

export default StartPage;
