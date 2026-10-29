import PageHeader from "@/components/PageHeader";

/** حساب ولي أمر غير مرتبط بطالب */
export default function NoStudent({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} subtitle="لا يوجد طالب مرتبط بهذا الحساب." />
      <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-2)" }}>راجع إدارة المعهد — حسابك غير مرتبط بطالب.</div>
    </>
  );
}
