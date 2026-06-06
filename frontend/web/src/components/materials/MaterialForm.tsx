'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Coins, TrendingUp, Percent, Sparkles, AlertTriangle } from 'lucide-react';

interface ApiMaterial {
  id: number;
  name: string;
  price_per_kg: number;
  fail_rate: number;
  default_margin: number;
}

interface MaterialFormProps {
  material: ApiMaterial | null;
  onSubmit: (data: Omit<ApiMaterial, 'id'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

// System round_to_100 logic
function roundTo100(value: number): number {
  if (value < 0) return 0;
  return Math.round(value / 100) * 100;
}

export default function MaterialForm({
  material,
  onSubmit,
  onCancel,
  isSubmitting,
}: MaterialFormProps) {
  // Input states
  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [failRateText, setFailRateText] = useState('1.00');
  const [marginText, setMarginText] = useState('');

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load editing material values
  useEffect(() => {
    if (material) {
      setName(material.name);
      setPriceText(Math.round(material.price_per_kg).toLocaleString('vi-VN'));
      setFailRateText(material.fail_rate.toString());
      setMarginText(Math.round(material.default_margin * 100).toString());
    } else {
      setName('');
      setPriceText('');
      setFailRateText('1.00');
      setMarginText('40'); // default 40%
    }
    setErrors({});
    setSubmitError(null);
  }, [material]);

  // Numeric parsing helpers
  const parsePrice = (text: string): number => {
    const cleanStr = text.replace(/\D/g, '');
    return cleanStr ? parseInt(cleanStr, 10) : 0;
  };

  const parseFailRate = (text: string): number => {
    const val = parseFloat(text);
    return isNaN(val) ? 1.00 : val;
  };

  const parseMargin = (text: string): number => {
    const val = parseFloat(text);
    return isNaN(val) ? 0 : val / 100;
  };

  // Live computed variables for simulator
  const pricePerKg = parsePrice(priceText);
  const failRate = parseFailRate(failRateText);
  const marginDecimal = parseMargin(marginText);

  const pricePerGram = pricePerKg / 1000;
  const effectivePricePerGram = pricePerGram * failRate;
  
  // Simulation for 100g sample product
  const simWeight = 100;
  const simCogs = simWeight * effectivePricePerGram;
  
  // Division by zero safeguard
  const marginDivisor = 1 - marginDecimal;
  const rawSuggestedPrice = marginDivisor > 0 ? simCogs / marginDivisor : 0;
  const finalSuggestedPrice = roundTo100(rawSuggestedPrice);

  // Custom VND input formatter with cursor position preservation
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const originalSelectionStart = input.selectionStart ?? 0;
    const originalValue = input.value;

    const rawDigits = originalValue.replace(/\D/g, '');
    const formattedValue = rawDigits ? Number(rawDigits).toLocaleString('vi-VN') : '';

    const prefixDigitsCount = originalValue.slice(0, originalSelectionStart).replace(/\D/g, '').length;

    let newSelectionIndex = 0;
    let digitsFound = 0;
    for (let i = 0; i < formattedValue.length; i++) {
      if (formattedValue[i] !== '.') {
        digitsFound++;
      }
      if (digitsFound <= prefixDigitsCount) {
        newSelectionIndex = i + 1;
      } else {
        break;
      }
    }

    setPriceText(formattedValue);

    requestAnimationFrame(() => {
      input.setSelectionRange(newSelectionIndex, newSelectionIndex);
    });
  };

  // Form validations
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Tên loại nhựa không được để trống';
    } else if (name.length > 50) {
      newErrors.name = 'Tên loại nhựa không dài quá 50 ký tự';
    }

    const priceNum = parsePrice(priceText);
    if (!priceText || priceNum <= 0) {
      newErrors.price_per_kg = 'Giá mua phải lớn hơn 0 VND';
    }

    const rateNum = parseFailRate(failRateText);
    if (isNaN(rateNum) || rateNum < 1.00) {
      newErrors.fail_rate = 'Tỷ lệ hỏng phải lớn hơn hoặc bằng 1.00';
    }

    const marginNum = parseFloat(marginText);
    if (isNaN(marginNum) || marginNum < 0) {
      newErrors.default_margin = 'Biên lợi nhuận phải lớn hơn hoặc bằng 0%';
    } else if (marginNum >= 100) {
      newErrors.default_margin = 'Biên lợi nhuận tối đa là 99% để tránh lỗi chia cho 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    try {
      await onSubmit({
        name: name.trim(),
        price_per_kg: parsePrice(priceText),
        fail_rate: parseFailRate(failRateText),
        default_margin: parseMargin(marginText),
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Lỗi hệ thống khi lưu loại nhựa');
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <h3 className="font-mono text-lg font-semibold tracking-wider text-slate-100 border-b border-border pb-3">
        {material ? 'CẬP NHẬT THÔNG TIN NHỰA' : 'THÊM MỚI LOẠI NHỰA IN'}
      </h3>

      {submitError && (
        <div className="flex gap-2 items-start p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Name input */}
        <div className="space-y-1">
          <label htmlFor="material-name" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tên loại nhựa <span className="text-red-500">*</span>
          </label>
          <input
            id="material-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: PLA, PETG, ABS-Carbon"
            className="w-full h-11 px-4 rounded-md border border-border bg-slate-900/60 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            disabled={isSubmitting}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* Price input */}
        <div className="space-y-1">
          <label htmlFor="material-price" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Giá mua cuộn 1kg (VND) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="material-price"
              type="text"
              value={priceText}
              onChange={handlePriceChange}
              placeholder="Ví dụ: 250.000"
              className="w-full h-11 pl-4 pr-12 rounded-md border border-border bg-slate-900/60 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono"
              disabled={isSubmitting}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">đ</span>
          </div>
          {errors.price_per_kg && <p className="text-xs text-red-500 mt-1">{errors.price_per_kg}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Fail Rate input */}
          <div className="space-y-1">
            <label htmlFor="material-fail-rate" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tỷ lệ hỏng (Fail Rate) <span className="text-red-500">*</span>
            </label>
            <input
              id="material-fail-rate"
              type="number"
              step="0.01"
              min="1.00"
              value={failRateText}
              onChange={(e) => setFailRateText(e.target.value)}
              placeholder="1.00"
              className="w-full h-11 px-4 rounded-md border border-border bg-slate-900/60 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono"
              disabled={isSubmitting}
            />
            <p className="text-[10px] text-slate-500 italic mt-0.5">Mặc định: 1.00 (Không hao hụt)</p>
            {errors.fail_rate && <p className="text-xs text-red-500 mt-1">{errors.fail_rate}</p>}
          </div>

          {/* Default Margin input */}
          <div className="space-y-1">
            <label htmlFor="material-margin" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Lợi nhuận mặc định (%) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="material-margin"
                type="number"
                min="0"
                max="99"
                value={marginText}
                onChange={(e) => setMarginText(e.target.value)}
                placeholder="40"
                className="w-full h-11 pl-4 pr-8 rounded-md border border-border bg-slate-900/60 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono"
                disabled={isSubmitting}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">%</span>
            </div>
            <p className="text-[10px] text-slate-500 italic mt-0.5">Giới hạn: 0% đến 99%</p>
            {errors.default_margin && <p className="text-xs text-red-500 mt-1">{errors.default_margin}</p>}
          </div>
        </div>
      </div>

      {/* Live Pricing Simulation Playground */}
      <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-3 shadow-inner">
        <div className="flex justify-between items-center border-b border-slate-900 pb-2">
          <h4 className="font-mono text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Giả lập giá vốn & bán lẻ (100g)
          </h4>
          <span className="text-[10px] font-mono text-zinc-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            Real-Time Engine
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-200">Giá nhựa thô/gram:</span>
            <span className="font-mono text-slate-300">
              {pricePerKg > 0 ? (pricePerGram).toFixed(2) : '0'} đ/g
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-200">Hệ số bù hao:</span>
            <span className="font-mono text-slate-300">x{failRate.toFixed(2)}</span>
          </div>

          <div className="flex justify-between border-b border-dashed border-slate-900 pb-1.5">
            <span className="text-zinc-200">Giá thực tế/gram:</span>
            <span className="font-mono text-slate-300">
              {pricePerKg > 0 ? (effectivePricePerGram).toFixed(2) : '0'} đ/g
            </span>
          </div>

          <div className="flex justify-between pt-1">
            <span className="text-zinc-200 font-medium">Giá vốn thô (COGS 100g):</span>
            <span className="font-mono text-emerald-400 font-semibold text-sm">
              {pricePerKg > 0 ? Math.round(simCogs).toLocaleString('vi-VN') : '0'} đ
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-slate-900 mt-1">
            <span className="text-zinc-200 font-bold">Giá bán gợi ý (100g):</span>
            {marginDecimal >= 1 ? (
              <span className="font-mono text-red-500 font-bold">NaN (Biên độ quá lớn)</span>
            ) : (
              <span className="font-mono text-emerald-400 font-bold text-base bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/20 shadow-glow">
                {pricePerKg > 0 ? finalSuggestedPrice.toLocaleString('vi-VN') : '0'} đ
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-900/40 p-2 rounded text-[10px] text-zinc-500 font-mono leading-relaxed border border-slate-900/60">
          * Công thức: COGS = (100g * Giá/g * Fail Rate). Giá bán lẻ gợi ý được làm tròn đến 100đ gần nhất (round_to_100).
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 px-4 rounded-md border border-border text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-all text-sm font-semibold"
          disabled={isSubmitting}
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          className="h-10 px-6 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <span>Lưu cấu hình</span>
          )}
        </button>
      </div>
    </form>
  );
}
