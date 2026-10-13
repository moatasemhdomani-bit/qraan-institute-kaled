"use client";

import { useState } from "react";
import Select from "./Select";

/**
 * فلترة حلقات شاشات المتابعة (الحضور والتسميع والسبر) بالفوج والمدرّس — قائمتان منسدلتان مع عدد ما ينطبق عليه كل خيار.
 * count: عدد ما يُحسب في الحلقة (الطلاب أو السبورات المطابقة لبقية الفلاتر). قائمة المدرّسين تتقلّص بحسب الفوج.
 */
export function useCohortTeacherFilter<T extends { cohortName: string; teacherName: string }>(blocks: T[], count: (b: T) => number) {
  const [cohort, setCohort] = useState("all");
  const [teacher, setTeacher] = useState("all");
  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "ar"));
  const sum = (bs: T[]) => bs.reduce((n, b) => n + count(b), 0);
  const inCohort = (b: T) => cohort === "all" || b.cohortName === cohort;
  const inTeacher = (b: T) => teacher === "all" || b.teacherName === teacher;

  const cohortOptions = [
    { value: "all", label: `كل الأفواج (${sum(blocks.filter(inTeacher))})` },
    ...uniq(blocks.map((b) => b.cohortName)).map((n) => ({ value: n, label: `فوج ${n} (${sum(blocks.filter((b) => b.cohortName === n && inTeacher(b)))})` })),
  ];
  const teacherOptions = [
    { value: "all", label: `كل المدرّسين (${sum(blocks.filter(inCohort))})` },
    ...uniq(blocks.filter(inCohort).map((b) => b.teacherName)).map((n) => ({
      value: n,
      label: `${n} (${sum(blocks.filter((b) => b.teacherName === n && inCohort(b)))})`,
    })),
  ];
  const shown = blocks.filter((b) => inCohort(b) && inTeacher(b));
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
