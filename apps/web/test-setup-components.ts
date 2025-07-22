import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock environment variables for components
vi.stubEnv("NODE_ENV", "test");
