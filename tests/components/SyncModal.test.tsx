import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { SyncModal } from "@/components/sync/SyncModal";
import { DEFAULT_SYNC_CONFIG } from "@/types/sync";

describe("SyncModal Component", () => {
  it("renders modal when isOpen is true and generates production URL", () => {
    const onUpdateConfig = vi.fn();
    const onGenerateRoomId = vi.fn(() => "JE-7777");

    render(
      <SyncModal
        isOpen={true}
        onClose={vi.fn()}
        syncConfig={{
          ...DEFAULT_SYNC_CONFIG,
          enabled: true,
          roomId: "JE-7777",
        }}
        syncStatus={{
          state: "connected",
          roomId: "JE-7777",
          lastSyncedAt: new Date(),
          connectedDeviceCount: 2,
          errorMessage: null,
        }}
        onUpdateConfig={onUpdateConfig}
        onGenerateRoomId={onGenerateRoomId}
      />
    );

    expect(screen.getByText("複数端末 リアルタイム同期")).toBeInTheDocument();
    expect(screen.getByDisplayValue("JE-7777")).toBeInTheDocument();

    // Verify shareable URL in read-only input points to public cloud domain
    const urlInput = screen.getByDisplayValue(/job-eval\.pages\.dev\?sync=JE-7777/);
    expect(urlInput).toBeInTheDocument();
  });

  it("handles connect button click with roomId", async () => {
    const onUpdateConfig = vi.fn();

    render(
      <SyncModal
        isOpen={true}
        onClose={vi.fn()}
        syncConfig={DEFAULT_SYNC_CONFIG}
        syncStatus={{
          state: "disconnected",
          roomId: null,
          lastSyncedAt: null,
          connectedDeviceCount: 1,
          errorMessage: null,
        }}
        onUpdateConfig={onUpdateConfig}
        onGenerateRoomId={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("例: JE-8492");
    fireEvent.change(input, { target: { value: "je-1234" } });

    const connectButton = screen.getByText("このルームIDでリアルタイム同期を開始");
    fireEvent.click(connectButton);

    expect(onUpdateConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        roomId: "JE-1234",
      })
    );
  });
});
