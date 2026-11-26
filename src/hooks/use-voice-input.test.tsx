import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceInput } from "./use-voice-input";

class FakeRecognition extends EventTarget {
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  startCount = 0;
  stopCount = 0;

  start() {
    this.startCount += 1;
  }
  stop() {
    this.stopCount += 1;
  }
  abort() {}
}

let instances: FakeRecognition[] = [];

function makeResultEvent(transcript: string, isFinal: boolean): Event {
  const ev = new Event("result") as Event & {
    resultIndex: number;
    results: {
      length: number;
      [index: number]: {
        length: number;
        [index: number]: { transcript: string; confidence: number };
        isFinal: boolean;
      };
    };
  };
  ev.resultIndex = 0;
  ev.results = {
    length: 1,
    0: {
      length: 1,
      0: { transcript, confidence: 0.9 },
      isFinal,
    },
  };
  return ev;
}

function recognition(): FakeRecognition {
  const rec = instances[0];
  if (!rec) throw new Error("SpeechRecognition was never constructed");
  return rec;
}

beforeEach(() => {
  instances = [];
  function Factory(this: unknown) {
    const rec = new FakeRecognition();
    instances.push(rec);
    return rec;
  }
  vi.stubGlobal("SpeechRecognition", Factory);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useVoiceInput dictation session", () => {
  it("runs continuously with interim results so short pauses do not stop it", () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => result.current.start());

    const rec = recognition();
    expect(rec.lang).toBe("el-GR");
    expect(rec.continuous).toBe(true);
    expect(rec.interimResults).toBe(true);
    expect(result.current.listening).toBe(true);
  });

  it("resumes on its own when the browser ends the session early", async () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => result.current.start());
    const rec = recognition();
    expect(rec.startCount).toBe(1);

    act(() => {
      rec.dispatchEvent(new Event("end"));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    expect(rec.startCount).toBe(2);
    expect(result.current.listening).toBe(true);
  });

  it("stops listening only when stop() is called", async () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => result.current.start());
    const rec = recognition();

    act(() => result.current.stop());
    expect(rec.stopCount).toBe(1);
    expect(result.current.listening).toBe(false);

    act(() => {
      rec.dispatchEvent(new Event("end"));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    expect(rec.startCount).toBe(1);
    expect(result.current.listening).toBe(false);
  });

  it("reports spoken words live before they are finalized", () => {
    const onInterim = vi.fn();
    const onResult = vi.fn();
    const { result } = renderHook(() => useVoiceInput({ onInterim, onResult }));

    act(() => result.current.start());
    const rec = recognition();

    act(() => {
      rec.dispatchEvent(makeResultEvent("κουζίνα 25", false));
    });
    expect(onInterim).toHaveBeenCalledWith("κουζίνα 25");
    expect(onResult).not.toHaveBeenCalled();

    act(() => {
      rec.dispatchEvent(makeResultEvent("Κουζίνα 25", true));
    });
    expect(onResult).toHaveBeenCalledWith("Κουζίνα 25");
  });
});
