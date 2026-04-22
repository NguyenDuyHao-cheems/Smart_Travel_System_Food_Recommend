import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import OnboardingPage from '../page';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('OnboardingPage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
    vi.clearAllMocks();
    
    // Mock global fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as any;

    // Mock process.env
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
  });

  it('initially generates and stores a secure UUID in localStorage', async () => {
    render(<OnboardingPage />);
    
    await waitFor(() => {
      const storedId = window.localStorage.getItem('food_recsys_userid');
      expect(storedId).toMatch(/^user_[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$/);
    });
  });

  it('shows error message if form is submitted with less than 3 dishes', async () => {
    render(<OnboardingPage />);
    
    const submitBtn = screen.getByText(/Khởi tạo Hồ sơ AI/i);
    fireEvent.click(submitBtn);

    try {
      const error = await screen.findByText(/Vui lòng chọn từ 3 đến 5 Món ăn yêu thích/i, {}, { timeout: 2000 });
      expect(error).toBeInTheDocument();
    } catch (err) {
      console.log('DOM CONTENT:', document.body.innerHTML);
      throw err;
    }
  });

  it('prevents submission if age is out of range', async () => {
    render(<OnboardingPage />);
    
    // Phải pass qua các cửa ải validation trước!
    // 1. Chọn 3 món
    fireEvent.click(screen.getByText('Phở'));
    fireEvent.click(screen.getByText('Cơm Tấm'));
    fireEvent.click(screen.getByText('Bánh Mì'));
    // 2. Chọn cay
    fireEvent.click(screen.getByText('50% Cay'));
    // 3. Chọn budget
    fireEvent.click(screen.getByText('Bình dân'));
    // 4. Chọn location
    fireEvent.change(screen.getByPlaceholderText(/Nhập địa chỉ của bạn/i), { target: { value: 'Saigon' } });
    
    // 5. Tuổi sai
    const ageInput = screen.getByPlaceholderText(/Ví dụ: 22/i);
    fireEvent.change(ageInput, { target: { value: '5' } });
    
    const submitBtn = screen.getByText(/Khởi tạo Hồ sơ AI/i);
    fireEvent.click(submitBtn);

    const error = await screen.findByText(/Độ tuổi của bạn chưa hợp lệ/i);
    expect(error).toBeInTheDocument();
  });

  it('submits correctly to the backend with environment URL', async () => {
    const testUrl = 'https://test-api.antigravity.ai';
    process.env.NEXT_PUBLIC_API_URL = testUrl;

    render(<OnboardingPage />);
    
    const ageInput = screen.getByPlaceholderText(/Ví dụ: 22/i);
    fireEvent.change(ageInput, { target: { value: '25' } });
    
    const locationInput = screen.getByPlaceholderText(/Nhập địa chỉ của bạn/i);
    fireEvent.change(locationInput, { target: { value: 'Saigon' } });

    const spicyBtn = screen.getByText('50% Cay');
    fireEvent.click(spicyBtn);

    const budgetBtn = screen.getByText('Bình dân');
    fireEvent.click(budgetBtn);

    const dish1 = screen.getByText('Phở');
    const dish2 = screen.getByText('Cơm Tấm');
    const dish3 = screen.getByText('Bánh Mì');
    fireEvent.click(dish1);
    fireEvent.click(dish2);
    fireEvent.click(dish3);

    const submitBtn = screen.getByText(/Khởi tạo Hồ sơ AI/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(testUrl),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"age":25'),
        })
      );
    });
  });
});
