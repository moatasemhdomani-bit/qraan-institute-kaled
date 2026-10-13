"use client";

import { useState } from "react";
import Select from "./Select";

/**
 * فلترة حلقات شاشات المتابعة (الحضور والتسميع والسبر) بالفوج والمدرّس — قائمتان منسدلتان.
 * قائمة المدرّسين تتقلّص بحسب الفوج المختار.
 */
export function useCohortTeacherFilter<T extends { cohortName: string; teacherName: string }>(blocks: T[]) {
  const [cohort, setCohort] = useState("all");
  const [teacher, setTeacher] = useState("all");
  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "ar"));
  const cohortOptions = [{ value: "all", label: "كل الأفواج" }, ...uniq(blocks.map((b) => b.cohortName)).map((n) => ({ value: n, label: `فوج ${n}` }))];
  const teacherOptions = [
    { value: "all", label: "كل المدرّسين" },
    ...uniq(blocks.filter((b) => cohort === "all" || b.cohortName === cohort).map((b) => b.teacherName)).map((n) => ({ value: n, label: n })),
  ];
  const shown = blocks.filter((b) => (cohort === "all" || b.cohortName === cohort) && (teacher === "all" || b.teacherName === teacher));
  const selects = (
    <>
      <Select
        value={cohort}
        onChange={(v) => {
          setCohort(v);
          setTeacher("all");
        }}
        options={cohortOptions}
      />
      <Select value={teacher} onChange={setTeacher} options={teacherOptions} />
    </>
  );
  return { shown, selects };
}
