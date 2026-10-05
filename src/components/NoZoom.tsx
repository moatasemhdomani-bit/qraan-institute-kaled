"use client";

import { useEffect } from "react";

/**
 * يمنع تكبير الصفحة بإصبعين على آيفون — سفاري يتجاهل «user-scalable=no» في وسم viewport،
 * فيُلغى حدث القرص نفسه. (أندرويد وبقية المتصفحات يكفيها وسم viewport.)
 */
export default function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop);
    document.addEventListener("gesturechange", stop);
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
    };
  }, []);
  return null;
}
