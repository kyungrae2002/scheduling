import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { formatTime } from '../utils';
import { Trophy, Flame, Crown, UserPlus, Copy, Check, X, Users } from 'lucide-react';
import { User } from 'firebase/auth';

interface CrewMember {
  uid: string;
  displayName: string;
  photoURL: string;
  todayEnergy: number;
}

interface CrewLeaderboardProps {
  user: User | null;
}

const FRIENDS_KEY = 'core_tab_friends';

export const CrewLeaderboard: React.FC<CrewLeaderboardProps> = ({ user }) => {
  const [myData, setMyData] = useState<CrewMember | null>(null);
  const [friendsData, setFriendsData] = useState<CrewMember[]>([]);
  const [friends, setFriends] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FRIENDS_KEY) || '[]'); }
    catch { return []; }
  });
  const [friendInput, setFriendInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // 내 데이터 실시간 구독
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'leaderboard', user.uid), (snap) => {
      if (snap.exists()) setMyData(snap.data() as CrewMember);
    });
    return () => unsub();
  }, [user]);

  // 친구 데이터 실시간 구독
  useEffect(() => {
    if (!user || friends.length === 0) { setFriendsData([]); return; }

    const unsubs = friends.map(uid =>
      onSnapshot(doc(db, 'leaderboard', uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as CrewMember;
          setFriendsData(prev => {
            const filtered = prev.filter(m => m.uid !== uid);
            return [...filtered, data];
          });
        }
      })
    );
    return () => unsubs.forEach(u => u());
  }, [user, friends]);

  // 친구 추가
  const addFriend = useCallback(async () => {
    const uid = friendInput.trim();
    if (!uid) return;
    if (uid === user?.uid) { setAddError('본인은 추가할 수 없습니다.'); return; }
    if (friends.includes(uid)) { setAddError('이미 추가된 친구입니다.'); return; }

    setIsAdding(true);
    setAddError('');
    try {
      const snap = await getDoc(doc(db, 'leaderboard', uid));
      if (snap.exists()) {
        const newFriends = [...friends, uid];
        setFriends(newFriends);
        localStorage.setItem(FRIENDS_KEY, JSON.stringify(newFriends));
        setFriendInput('');
        setShowAddPanel(false);
      } else {
        setAddError('해당 코드의 유저를 찾을 수 없습니다.\n앱을 한 번 이상 실행한 유저만 추가 가능합니다.');
      }
    } catch {
      setAddError('네트워크 오류가 발생했습니다.');
    }
    setIsAdding(false);
  }, [friendInput, friends, user]);

  // 친구 삭제
  const removeFriend = (uid: string) => {
    const newFriends = friends.filter(f => f !== uid);
    setFriends(newFriends);
    setFriendsData(prev => prev.filter(m => m.uid !== uid));
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(newFriends));
  };

  // 초대 코드 복사
  const copyCode = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // 전체 리더보드 (나 + 친구) 정렬 - 렌더마다 재계산하지 않도록 메모이제이션
  const sorted = useMemo(() => {
    const memberMap = new Map<string, CrewMember>();
    if (myData) memberMap.set(myData.uid, myData);
    friendsData.forEach(f => memberMap.set(f.uid, f)); // Map으로 O(n²) dedup → O(n)
    return Array.from(memberMap.values()).sort((a, b) => b.todayEnergy - a.todayEnergy);
  }, [myData, friendsData]);

  if (!user) {
    return (
      <div className="bg-white/60 dark:bg-zinc-800/40 backdrop-blur-xl rounded-[3rem] shadow-xl border border-white/50 dark:border-zinc-700/50 p-6 md:p-10 flex flex-col items-center justify-center min-h-[400px]">
        <Trophy size={48} className="text-zinc-300 dark:text-zinc-600 mb-6" />
        <h3 className="text-xl font-black text-zinc-600 dark:text-zinc-400 mb-2">마이 크루 랭킹 기능</h3>
        <p className="text-sm font-bold text-zinc-500 text-center leading-relaxed">
          다른 사람들과 나의 집중 시간을 비교해보세요.<br />
          왼쪽 상단 메뉴(☰)에서 구글 로그인을 하시면<br />
          바로 데이터가 동기화됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/60 dark:bg-zinc-800/40 backdrop-blur-xl rounded-[3rem] shadow-xl border border-white/50 dark:border-zinc-700/50 p-6 md:p-10 flex flex-col relative overflow-hidden transition-colors">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-zinc-900 dark:text-white text-3xl font-black tracking-tight">My Crew</h3>
            <div className="px-3 py-1 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center gap-1 shadow-sm">
              <Flame size={14} className="text-white" />
              <span className="text-xs font-black text-white tracking-wide">ON AIR</span>
            </div>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 font-bold text-base">
            {sorted.length <= 1 ? '친구를 추가해서 함께 경쟁해보세요!' : '오늘 가장 많이 집중한 크루 리더보드'}
          </p>
        </div>
        <button
          onClick={() => { setShowAddPanel(!showAddPanel); setAddError(''); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors font-bold text-sm shrink-0"
        >
          <UserPlus size={16} />
          친구 추가
        </button>
      </div>

      {/* 친구 추가 패널 */}
      {showAddPanel && (
        <div className="mb-5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700">
          {/* 내 초대 코드 */}
          <div className="mb-4">
            <p className="text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">내 초대 코드</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 truncate">
                {user.uid}
              </code>
              <button
                onClick={copyCode}
                className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-500 shrink-0"
                title="코드 복사"
              >
                {codeCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* 친구 코드 입력 */}
          <p className="text-xs font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">친구 코드 입력</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={friendInput}
              onChange={e => { setFriendInput(e.target.value); setAddError(''); }}
              onKeyDown={e => e.key === 'Enter' && addFriend()}
              placeholder="친구의 초대 코드를 입력하세요"
              className="flex-1 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-orange-400 transition-colors font-mono"
            />
            <button
              onClick={addFriend}
              disabled={isAdding || !friendInput.trim()}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm transition-colors shrink-0"
            >
              {isAdding ? '...' : '추가'}
            </button>
          </div>
          {addError && (
            <p className="text-xs text-red-500 mt-2 font-medium whitespace-pre-line">{addError}</p>
          )}
        </div>
      )}

      {/* 리더보드 목록 */}
      <div className="flex flex-col gap-3">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-3">
            <Users size={40} className="text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-bold">아직 크루가 없습니다</p>
            <p className="text-xs text-zinc-400">위에서 친구 코드를 공유하고 추가해보세요!</p>
          </div>
        ) : (
          sorted.map((member, idx) => {
            const isMe = member.uid === user.uid;
            const isTop1 = idx === 0;
            return (
              <div
                key={member.uid}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-500/30 shadow-md'
                    : 'bg-white dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800'
                }`}
              >
                {/* Rank */}
                <div className="w-8 flex justify-center shrink-0">
                  {isTop1
                    ? <Crown size={24} className="text-yellow-500" />
                    : <span className={`text-xl font-black ${idx < 3 ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400'}`}>{idx + 1}</span>
                  }
                </div>

                {/* Avatar */}
                <img
                  src={member.photoURL || ''}
                  alt=""
                  className="w-11 h-11 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm object-cover bg-zinc-200 shrink-0"
                />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-zinc-900 dark:text-white text-base truncate flex items-center gap-2">
                    {member.displayName}
                    {isMe && (
                      <span className="text-[10px] bg-orange-200 text-orange-800 dark:bg-orange-600 dark:text-orange-100 px-2 py-0.5 rounded-full font-black">나</span>
                    )}
                  </p>
                </div>

                {/* Score + 삭제 버튼 */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-lg font-black tabular-nums ${isTop1 || isMe ? 'text-orange-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {formatTime(member.todayEnergy)}
                  </span>
                  {!isMe && (
                    <button
                      onClick={() => removeFriend(member.uid)}
                      className="p-1 rounded-full text-zinc-300 hover:text-red-400 transition-colors"
                      title="크루에서 제거"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
