import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/toast-context.js';
import api from '../../services/api.js';
import { LoadingSpinner } from '../../components/loading-spinner.js';
import { Key, ShieldAlert, CheckCircle, Copy, UploadCloud, ArrowLeft, Calendar, Building, Users } from 'lucide-react';
import { APP_CONFIG } from '../../config.js';


export const LicenseActivation: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [licenseText, setLicenseText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fetchLicenseStatus = async () => {
    try {
      setLoading(true);
      const res: any = await api.get('/license/status');
      if (res && res.data) {
        setStatus(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถดึงข้อมูลสถานะลิขสิทธิ์ได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenseStatus();
  }, []);

  const handleCopyHardwareId = () => {
    if (!status?.currentMachineId) return;
    navigator.clipboard.writeText(status.currentMachineId);
    showToast('คัดลอกรหัสประจำเครื่องลงคลิปบอร์ดแล้ว (Copy Hardware ID to Clipboard)', 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readLicenseFile(file);
  };

  const readLicenseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        // Validate JSON format
        JSON.parse(text);
        setLicenseText(text);
        showToast('โหลดไฟล์ลิขสิทธิ์เรียบร้อยแล้ว (Loaded License File)', 'info');
      } catch {
        showToast('ไฟล์ดังกล่าวไม่ได้อยู่ในรูปแบบ JSON ที่ถูกต้อง (Invalid JSON file)', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readLicenseFile(file);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseText.trim()) {
      showToast('กรุณากรอกหรือระบุไฟล์ลิขสิทธิ์ก่อนดำเนินการ (Please provide a license key)', 'warning');
      return;
    }

    try {
      setActivating(true);
      const res: any = await api.post('/license/activate', {
        licenseKey: licenseText.trim()
      });

      if (res.success) {
        showToast('เปิดใช้งานสิทธิ์ระบบเรียบร้อยแล้ว! (License Activated)', 'success');
        setStatus(res.data);
        setLicenseText('');
        // Wait 1.5 seconds then redirect to homepage
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (err: any) {
      showToast(err.message || 'เปิดใช้งานลิขสิทธิ์ล้มเหลว ตรวจสอบข้อมูลอีกครั้ง', 'error');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-slate-500 font-medium">กำลังตรวจสอบสถานะสิทธิ์การใช้งานระบบ...</p>
        </div>
      </div>
    );
  }

  const isLicenseValid = status?.isValid;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-300">

        {/* Header Indicator Banner */}
        <div className={`p-6 text-white text-center relative overflow-hidden ${isLicenseValid ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-rose-500 to-red-600'}`}>
          <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
          <div className="relative z-10 flex flex-col items-center space-y-2">
            <div className="bg-white/10 p-3 rounded-full backdrop-blur-md">
              {isLicenseValid ? (
                <CheckCircle size={32} className="text-emerald-100" />
              ) : (
                <ShieldAlert size={32} className="text-rose-100" />
              )}
            </div>
            <h1 className="text-xl font-bold tracking-wide">
              {isLicenseValid ? 'เปิดใช้งานระบบเรียบร้อย' : 'ระบบถูกล็อก / ใบอนุญาตไม่ถูกต้อง'}
            </h1>
            <p className="text-xs text-white/80">
              Carbon Footprint System (ระบบจัดการข้อมูลคาร์บอนฟุตพริ้นท์)
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* Active License Details (If Valid) */}
          {isLicenseValid && status && (
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-emerald-800">รายละเอียดสิทธิ์การใช้งานระบบ</h3>
              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="space-y-1">
                  <span className="text-slate-400 block font-medium">ชื่อลูกค้า (Customer):</span>
                  <span className="font-semibold text-slate-800">{status.customer}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block font-medium">วันหมดอายุ (Expiry Date):</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    {new Date(status.expiresAt).toLocaleDateString('th-TH')}
                  </span>
                </div>
                <div className="space-y-1 border-t border-emerald-100/50 pt-2 col-span-2">
                  <span className="text-slate-400 block font-medium">ขอบเขตสิทธิ์อนุญาต (Scope Limits):</span>
                  <div className="flex gap-4 mt-1">
                    <span className="flex items-center gap-1">
                      <Users size={12} className="text-slate-400" />
                      บัญชีสูงสุด: {status.maxUsers} ยูสเซอร์
                    </span>
                    <span className="flex items-center gap-1">
                      <Building size={12} className="text-slate-400" />
                      องค์กรสูงสุด: {status.maxOrganizations} แห่ง
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Locked Explanation (If Invalid) */}
          {!isLicenseValid && (
            <div className="space-y-3">
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-800 space-y-2">
                <p className="font-semibold">⚠️ เหตุผลที่ระบบถูกระงับการทำงาน:</p>
                <ul className="list-disc list-inside space-y-1 text-rose-700/90 pl-1">
                  <li>ไฟล์ใบอนุญาต (`license.json`) หายไปหรือถูกลบออก</li>
                  <li>สัญญาสิทธิ์ใช้งานหมดอายุตามกรอบเวลาที่ตกลงกัน</li>
                  <li>ระบบถูกคัดลอกไปติดตั้งบนเครื่องแม่ข่ายอื่นที่ไม่ได้รับอนุญาต</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800">
                  📞 ช่องทางติดต่อเพื่อขอรหัสใบอนุญาต:
                </p>
                <div className="pl-1 space-y-1 text-slate-500">
                  <p>• <strong>ทีมผู้พัฒนาระบบ (Developer Support):</strong> <a href={`mailto:${APP_CONFIG.supportEmail}`} className="text-blue-600 hover:underline">{APP_CONFIG.supportEmail}</a></p>
                  <p>• <strong>สายด่วนผู้พัฒนาระบบ:</strong> {APP_CONFIG.supportPhone} (เวลาทำการ {APP_CONFIG.supportHours})</p>
                </div>
              </div>
            </div>
          )}

          {/* Hardware ID Display */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex justify-between items-center">
              <span>รหัสประจำเครื่องแม่ข่าย (Server Hardware ID)</span>
              <span className="text-[10px] text-slate-400 font-normal">ล็อกเฉพาะตัวเซิร์ฟเวอร์</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={status?.currentMachineId || ''}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 outline-none"
              />
              <button
                type="button"
                onClick={handleCopyHardwareId}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
                title="คัดลอกรหัสประจำเครื่อง"
              >
                <Copy size={14} />
                <span>คัดลอก</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              * โปรดนำส่งรหัสเครื่องด้านบนให้แก่ผู้พัฒนาโปรเจกต์ เพื่อนำไปออกกุญแจยืนยันสิทธิ์ใช้งาน (`license.json`)
            </p>
          </div>

          <hr className="border-slate-100" />

          {/* Activation Form */}
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                ป้อนรหัสใบอนุญาตใหม่ (Paste license.json content)
              </label>

              {/* Drag and Drop Zone / Text Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${isDragOver
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                  }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <textarea
                  value={licenseText}
                  onChange={(e) => setLicenseText(e.target.value)}
                  placeholder="วางเนื้อหา JSON ลิขสิทธิ์ของคุณที่นี่ หรือลากไฟล์ license.json มาวางลงในกล่องนี้..."
                  rows={6}
                  className="w-full bg-transparent border-0 rounded-xl px-4 py-3 text-xs font-mono text-slate-700 placeholder-slate-400 focus:ring-0 focus:outline-none resize-none"
                />

                {/* Upload Overlay indicator when empty */}
                {!licenseText && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none cursor-pointer bg-transparent"
                  >
                    <UploadCloud size={24} className="text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-500 font-medium">ลากไฟล์ใบอนุญาตมาวางที่นี่ หรือคลิกเพื่ออัปโหลด</span>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,.lic,.txt"
                className="hidden"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {isLicenseValid && (
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>กลับเข้าสู่ระบบ</span>
                </button>
              )}

              <button
                type="submit"
                disabled={activating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/15 hover:shadow-emerald-600/25 transition-all"
              >
                {activating ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>กำลังเปิดสิทธิ์ใช้งาน...</span>
                  </>
                ) : (
                  <>
                    <Key size={16} />
                    <span>เปิดสิทธิ์ใช้งานระบบ</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LicenseActivation;
