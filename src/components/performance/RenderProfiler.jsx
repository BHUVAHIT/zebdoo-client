import { Profiler, useMemo } from "react";
import {
  createRenderProfilerHandler,
  shouldEnableRenderProfiling,
} from "../../shared/utils/renderProfiler";

const RenderProfiler = ({ id, thresholdMs = 10, children }) => {
  const enabled = shouldEnableRenderProfiling();
  const onRender = useMemo(
    () => createRenderProfilerHandler(id, thresholdMs),
    [id, thresholdMs]
  );

  if (!enabled) {
    return children;
  }

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
};

export default RenderProfiler;
