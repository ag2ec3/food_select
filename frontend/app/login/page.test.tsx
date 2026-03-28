import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

const { mockPush, mockReplace, loginFn, useAuthImpl } = vi.hoisted(() => {
  const loginFn = vi.fn();
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const useAuthImpl = vi.fn(() => ({
    user: null as null,
    ready: true,
    login: loginFn,
    signUp: vi.fn(),
    logout: vi.fn(),
  }));
  return { mockPush, mockReplace, loginFn, useAuthImpl };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

vi.mock("next/link", () => ({
  default ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  },
}));

vi.mock("@/lib/authContext", () => ({
  useAuth: useAuthImpl,
}));

function setupAuth(overrides: Partial<ReturnType<typeof useAuthImpl>> = {}) {
  useAuthImpl.mockImplementation(() => ({
    user: null,
    ready: true,
    login: loginFn,
    signUp: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  }));
}

describe("LoginPage — security / logic expectations (intentionally Red vs current page)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loginFn.mockReset();
    setupAuth();
    loginFn.mockResolvedValue({ ok: true as const });
  });

  /**
   * 1) 클라이언트 검증 부재 + noValidate: 공백만 있는 비밀번호(BVA)가 API 계층으로 그대로 넘어가면
   *    의미 없는 시도·노이즈 로그·정책 우회(공백 비밀번호) 위험이 커진다.
   *    기대: 페이지에서 차단하고 login을 호출하지 않는다.
   */
  it("rejects whitespace-only password before calling login (BVA)", async () => {
    // Given: 이메일은 채워져 있고 비밀번호는 공백 문자만 경계값
    setupAuth();
    loginFn.mockResolvedValue({ ok: true as const });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/이메일/i), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/비밀번호/i), {
      target: { value: "   " },
    });

    // When: 폼 제출
    fireEvent.click(screen.getByRole("button", { name: /로그인/i }));

    // Then: Supabase/auth로 넘기지 않고 클라이언트에서 막는다
    await waitFor(() => {
      expect(loginFn).not.toHaveBeenCalled();
    });
    expect(screen.getByRole("alert").textContent).toBeTruthy();
  });

  /**
   * 2) noValidate로 브라우저 이메일 검증이 꺼져 있음. '@' 없는 값(BVA)도 그대로 login에 전달된다.
   *    기대: 페이지에서 형식 검증 후 login 미호출.
   */
  it("rejects email without @ before calling login (BVA)", async () => {
    // Given: @ 없는 이메일 형식 경계
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/이메일/i), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByLabelText(/비밀번호/i), {
      target: { value: "secret" },
    });

    // When
    fireEvent.click(screen.getByRole("button", { name: /로그인/i }));

    // Then
    await waitFor(() => {
      expect(loginFn).not.toHaveBeenCalled();
    });
  });

  /**
   * 3) 제출 중 비동기 대기 시 상태 커밋 전 연속 submit이 가능하면 동일 자격증명으로 중복 로그인 시도(레이스)가 난다.
   *    기대: login은 한 번만 호출된다.
   */
  it("does not call login twice when submit fires twice while login is pending", async () => {
    // Given: resolve되지 않는 login으로 첫 제출이 대기 중
    let resolveLogin!: (v: { ok: true }) => void;
    loginFn.mockImplementation(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveLogin = resolve;
        }),
    );
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/이메일/i), {
      target: { value: "a@b.co" },
    });
    fireEvent.change(screen.getByLabelText(/비밀번호/i), {
      target: { value: "pw" },
    });
    const form = screen.getByRole("button", { name: /로그인/i }).closest("form")!;

    // When: 연속 제출(첫 호출이 끝나기 전)
    fireEvent.submit(form);
    fireEvent.submit(form);

    // Then
    await waitFor(() => {
      expect(loginFn).toHaveBeenCalledTimes(1);
    });
    resolveLogin!({ ok: true });
  });

  /**
   * 4) 입력 길이 상한 없음: 극단적으로 긴 이메일(BVA)은 메모리·요청 크기·로그 측면에서 부담이 된다.
   *    기대: 페이지에서 거절하고 login 미호출.
   */
  it("rejects extremely long email without calling login (BVA)", async () => {
    // Given: RFC를 훨씬 넘는 길이(경계 스트레스)
    const longLocal = `${"a".repeat(5000)}@x.com`;
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/이메일/i), {
      target: { value: longLocal },
    });
    fireEvent.change(screen.getByLabelText(/비밀번호/i), {
      target: { value: "pw" },
    });

    // When
    fireEvent.click(screen.getByRole("button", { name: /로그인/i }));

    // Then
    await waitFor(() => {
      expect(loginFn).not.toHaveBeenCalled();
    });
  });

  /**
   * 5) login()이 ok여도 컨텍스트 user가 아직 null이면 세션 반영 전 이동이 될 수 있다(오픈 리다이렉트/가드 우회에 가까운 논리 오류).
   *    기대: user가 준비될 때까지 router.push 하지 않는다.
   */
  it("does not router.push until auth user is present after successful login", async () => {
    // Given: 성공 응답이지만 훅 상 user는 여전히 null
    setupAuth({ user: null });
    loginFn.mockResolvedValue({ ok: true as const });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/이메일/i), {
      target: { value: "ok@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/비밀번호/i), {
      target: { value: "pw" },
    });

    // When
    fireEvent.click(screen.getByRole("button", { name: /로그인/i }));

    // Then: 세션/유저 반영 전에는 이동하지 않음
    await waitFor(() => {
      expect(loginFn).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
