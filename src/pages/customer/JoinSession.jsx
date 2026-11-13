import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore';
import apiClient from '../../api/client';
import { useQuery } from '@tanstack/react-query';
import { Clock, Menu as MenuIcon, User, KeyRound, Users, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function JoinSession() {
  const {
    sessionId,
    sessionToken,
    status,
    table,
    branchId,
    participantId,
    requiresJoinCode,
    participantCount,
    hostName,
    setSession,
  } = useSessionStore();
  const navigate = useNavigate();
  const [guestCount, setGuestCount] = useState(2);
  const [guestName, setGuestName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Poll session status every 2.5 seconds if status is 0 OR to detect if someone else already claimed first guest
  useQuery({
    queryKey: ['sessionStatus', sessionId, participantId],
    queryFn: async () => {
      if (!sessionId) return null;
      const res = await apiClient.get(`/sessions/${sessionId}`);
      const sessionData = res.data || res;

      const updates = {
        status: sessionData.Status,
        participantCount: sessionData.participantCount ?? participantCount,
        hostName: sessionData.hostName ?? hostName,
        participants: sessionData.participants || [],
      };

      // Nếu chưa join mà bàn đã có người thứ 1 tham gia trước -> chuyển sang chế độ bắt nhập mã tham gia
      if (!participantId && sessionData.participantCount > 0 && !requiresJoinCode) {
        updates.requiresJoinCode = true;
      }

      if (participantId && sessionData.JoinCode) {
        updates.joinCode = sessionData.JoinCode;
      }

      setSession(updates);

      if (sessionData.Status === 1 && participantId) {
        toast.success('Bàn đã được mở! Mã tham gia của bàn đã sẵn sàng.');
        navigate('/customer/menu');
      }
      return sessionData;
    },
    refetchInterval: 2500,
    enabled: !!sessionId && (status === 0 || !participantId),
  });

  useEffect(() => {
    if (status === 1 && participantId) {
      navigate('/customer/menu');
    }
  }, [status, participantId, navigate]);

  useEffect(() => {
    if (!sessionId) {
      navigate('/customer/qr');
    }
  }, [sessionId, navigate]);

  if (!sessionId) {
    return null;
  }

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error('Vui lòng nhập tên của bạn');
      return;
    }

    if (requiresJoinCode && !joinCodeInput.trim()) {
      toast.error('Vui lòng nhập Mã tham gia của bàn');
      return;
    }

    setIsSubmitting(true);
    try {
      const codeToSend = requiresJoinCode ? joinCodeInput.trim().toUpperCase() : sessionToken;
      const res = await apiClient.post('/sessions/join', {
        sessionId,
        sessionCode: codeToSend,
        guestName: guestName.trim(),
        branchId,
        guestCount: requiresJoinCode ? undefined : Number(guestCount),
      });

      const joinData = res.data || res;

      setSession({
        participantId: joinData.participantId,
        guestName: joinData.guestName,
        sessionToken: joinData.sessionToken || sessionToken,
        joinCode: joinData.joinCode,
        status: joinData.status ?? status,
        isHost: Boolean(joinData.isHost),
        requiresJoinCode: false,
      });

      if ((joinData.status ?? status) === 1) {
        toast.success(
          requiresJoinCode
            ? `Chào ${joinData.guestName}! Đã tham gia bàn cùng ${hostName || 'nhóm'}.`
            : `Chào ${joinData.guestName}! Bàn đã mở sẵn sàng.`
        );
        navigate('/customer/menu');
      } else {
        toast.success('Đã gửi yêu cầu mở bàn! Vui lòng chờ nhân viên xác nhận.');
      }
    } catch (err) {
      toast.error(err.message || 'Không thể tham gia bàn');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trường hợp: Người thứ 2, 3, 4 quét QR khi bàn chưa được nhân viên mở (status === 0)
  if (!participantId && requiresJoinCode && status === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-bg-page relative p-6 justify-center items-center">
        <div className="w-full max-w-[380px] bg-white rounded-3xl shadow-xl p-8 border border-border text-center">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={36} className="animate-pulse" />
          </div>
          <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest mb-1">
            {table?.tableName || 'BÀN ĂN'}
          </p>
          <h2 className="text-[22px] font-extrabold text-text-primary mb-3">
            Bàn đang chờ mở
          </h2>
          <p className="text-[14px] text-text-secondary leading-relaxed mb-6">
            Bàn này đã được <span className="font-bold text-text-primary">{hostName || 'người đầu tiên'}</span> yêu cầu mở. Ngay khi nhân viên xác nhận mở bàn, mã tham gia sẽ xuất hiện trên màn hình của <span className="font-bold text-text-primary">{hostName || 'người đầu tiên'}</span> để bạn nhập vào.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-[12px] text-amber-800 font-medium">
            Màn hình sẽ tự động chuyển sang ô nhập Mã tham gia ngay khi bàn được mở...
          </div>
        </div>
      </div>
    );
  }

  // State 1: Chưa tham gia (Người thứ 1 mở bàn HOẶC Người thứ 2, 3, 4 nhập Mã tham gia)
  if (!participantId) {
    return (
      <div className="flex flex-col min-h-screen bg-bg-page relative">
        {/* Top Orange Header */}
        <div className="bg-primary pt-12 pb-24 px-6 flex flex-col items-center text-white relative">
          <div className="w-16 h-16 bg-white text-primary rounded-2xl flex items-center justify-center font-bold text-3xl mb-4 shadow-lg">
            B
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Nhà hàng BBQ KLTN</h1>
          <p className="text-white/80 font-medium text-[13px] mt-1">
            {table?.areaName ? `${table.areaName}` : 'Hệ thống gọi món tại bàn'}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="flex-1 px-6 -mt-16 z-10">
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-border mb-8">
            <div className="text-center mb-6">
              <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest mb-1">BẠN ĐANG NGỒI TẠI</p>
              <h2 className="text-[38px] font-black text-primary leading-none">{table?.tableName || '...'}</h2>
              {requiresJoinCode ? (
                <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-1.5 rounded-full text-[12px] font-bold">
                  <Users size={14} className="text-amber-600" />
                  <span>
                    Bàn đã có {participantCount || 1} người ({hostName || 'Chủ bàn'})
                  </span>
                </div>
              ) : (
                <p className="text-[13px] text-text-secondary mt-2">
                  Bạn là người đầu tiên quét mã QR tại bàn này
                </p>
              )}
            </div>

            <form onSubmit={handleJoin}>
              {requiresJoinCode ? (
                /* Giao diện cho người thứ 2, 3, 4: Bắt buộc nhập Mã tham gia + Tên */
                <>
                  <div className="mb-5 bg-primary/5 border border-primary/20 rounded-2xl p-3.5 text-[12.5px] text-text-secondary leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                      <ShieldCheck size={16} />
                      <span>Yêu cầu Mã tham gia bàn</span>
                    </div>
                    Vui lòng xem <strong>Mã tham gia (6 ký tự)</strong> hiển thị trên giao diện của{' '}
                    <strong>{hostName || 'người mở bàn đầu tiên'}</strong> để cùng gọi món.
                  </div>

                  <div className="mb-6">
                    <label className="block text-[11px] font-bold text-text-tertiary uppercase tracking-widest text-center mb-3">
                      MÃ THAM GIA CỦA BÀN
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
                        <KeyRound size={18} />
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        placeholder="VD: AB12CD"
                        className="w-full pl-11 pr-4 py-4 border-2 border-primary/40 rounded-xl bg-bg-page focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-white transition-colors font-mono font-extrabold text-[20px] tracking-[0.25em] text-center uppercase text-text-primary"
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Giao diện cho người thứ 1: Chọn số lượng khách */
                <div className="mb-6">
                  <label className="block text-[11px] font-bold text-text-tertiary uppercase tracking-widest text-center mb-4">
                    SỐ LƯỢNG KHÁCH
                  </label>
                  <div className="flex justify-between gap-3">
                    {[1, 2, 3, 4].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGuestCount(num)}
                        className={`flex-1 aspect-square rounded-2xl flex items-center justify-center text-xl font-bold transition-all ${
                          guestCount === num 
                            ? 'bg-primary-subtle text-primary border-2 border-primary' 
                            : 'bg-bg-page border border-border text-text-secondary hover:bg-gray-50'
                        }`}
                      >
                        {num}{num === 4 ? '+' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <label className="block text-[11px] font-bold text-text-tertiary uppercase tracking-widest text-center mb-3">
                  TÊN CỦA BẠN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-tertiary">
                    <User size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={requiresJoinCode ? 'VD: Chị Lan, Anh Tuấn...' : 'VD: Anh Minh...'}
                    className="w-full pl-11 p-4 border border-border rounded-xl bg-bg-page focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors font-medium text-[15px]"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 shadow-md shadow-primary/30"
              >
                {isSubmitting ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : null}
                {isSubmitting
                  ? 'Đang xử lý...'
                  : requiresJoinCode
                    ? 'Tham gia bàn cùng gọi món'
                    : status === 1
                      ? 'Vào bàn ngay'
                      : 'Gửi yêu cầu mở bàn'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Người thứ 1 đã gửi yêu cầu mở bàn, đang chờ nhân viên xác nhận
  return (
    <div className="flex flex-col min-h-screen bg-bg-page relative p-6 justify-center items-center">
      {/* Decorative pulse */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-primary/10 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>

      <div className="relative z-10 flex flex-col items-center mb-12">
        <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 mb-8">
          <Clock size={40} className="animate-pulse" />
        </div>
        
        <h2 className="text-[24px] font-extrabold text-text-primary mb-3 text-center">
          Đang chờ nhân viên<br/>xác nhận mở bàn
        </h2>
        
        <p className="text-[14px] text-text-secondary text-center max-w-[300px] leading-relaxed">
          Bạn đã đăng ký mở Bàn <strong>{table?.tableName || '...'}</strong>. Ngay khi nhân viên xác nhận mở bàn, <strong>Mã tham gia</strong> sẽ hiển thị trên màn hình của bạn để chia sẻ cho bạn bè cùng bàn.
        </p>

        <div className="flex gap-1 mt-6">
          <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>

      <div className="w-full max-w-[320px] bg-white border border-border rounded-2xl p-4 shadow-sm flex items-center gap-3 relative z-10 mb-8">
        <div className="w-10 h-10 bg-primary-subtle text-primary rounded-xl flex items-center justify-center font-bold text-lg">
          B
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-text-primary">BBQ KLTN</h3>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Bàn {table?.tableName || '...'} · Mã phiên #{sessionId || '...'}
          </p>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex justify-center z-10">
        <button 
          onClick={() => navigate('/customer/menu')}
          className="w-full max-w-[320px] bg-white border-2 border-primary text-primary hover:bg-primary-subtle font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <MenuIcon size={18} /> Xem trước thực đơn
        </button>
      </div>
    </div>
  );
}
