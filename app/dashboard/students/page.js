"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function StudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    guardianPhone: "",
    groupId: "",
    registrationDate: "",
    status: "active",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [studentsSnapshot, groupsSnapshot] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "groups")),
      ]);

      const studentsData = studentsSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      const groupsData = groupsSnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      studentsData.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "ar")
      );

      groupsData.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "ar")
      );

      setStudents(studentsData);
      setGroups(groupsData);
    } catch (error) {
      console.error("LOAD STUDENTS ERROR:", error);

      const message =
        "كود الخطأ: " +
        (error.code || "غير معروف") +
        "\nالرسالة: " +
        (error.message || "غير معروفة");

      setErrorMessage(message);

      alert("حدث خطأ أثناء تحميل البيانات\n\n" + message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      guardianPhone: "",
      groupId: "",
      registrationDate: new Date().toISOString().split("T")[0],
      status: "active",
    });

    setEditingId(null);
  };

  const getGroupName = (groupId) => {
    const group = groups.find((item) => item.id === groupId);

    return group ? group.name : "مجموعة غير موجودة";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMessage("");

    if (!form.name.trim()) {
      alert("من فضلك أدخل اسم الطالب");
      return;
    }

    if (!form.guardianPhone.trim()) {
      alert("من فضلك أدخل رقم ولي الأمر");
      return;
    }

    if (!form.groupId) {
      alert("من فضلك اختر مجموعة الطالب");
      return;
    }

    if (!form.registrationDate) {
      alert("من فضلك حدد تاريخ التسجيل");
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        const oldStudent = students.find(
          (student) => student.id === editingId
        );

        const oldGroupId = oldStudent?.groupId || null;
        const newGroupId = form.groupId;

        await updateDoc(doc(db, "students", editingId), {
          name: form.name.trim(),
          guardianPhone: form.guardianPhone.trim(),
          groupId: newGroupId,
          registrationDate: form.registrationDate,
          status: form.status,
          updatedAt: serverTimestamp(),
        });

        if (oldGroupId !== newGroupId) {
          const historyQuery = query(
            collection(db, "studentGroupHistory"),
            where("studentId", "==", editingId),
            where("endDate", "==", null)
          );

          const historySnapshot = await getDocs(historyQuery);

          for (const historyDoc of historySnapshot.docs) {
            await updateDoc(historyDoc.ref, {
              endDate: form.registrationDate,
              updatedAt: serverTimestamp(),
            });
          }

          await addDoc(collection(db, "studentGroupHistory"), {
            studentId: editingId,
            groupId: newGroupId,
            startDate: form.registrationDate,
            endDate: null,
            createdAt: serverTimestamp(),
          });
        }

        resetForm();
        setShowForm(false);

        await loadData();

        alert("تم تعديل بيانات الطالب بنجاح");
      } else {
        const studentRef = await addDoc(collection(db, "students"), {
          name: form.name.trim(),
          guardianPhone: form.guardianPhone.trim(),
          groupId: form.groupId,
          registrationDate: form.registrationDate,
          status: form.status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await addDoc(collection(db, "studentGroupHistory"), {
          studentId: studentRef.id,
          groupId: form.groupId,
          startDate: form.registrationDate,
          endDate: null,
          createdAt: serverTimestamp(),
        });

        resetForm();
        setShowForm(false);

        await loadData();

        alert("تم إضافة الطالب بنجاح");
      }
    } catch (error) {
      console.error("STUDENT SAVE ERROR:", error);

      const message =
        "كود الخطأ: " +
        (error.code || "غير معروف") +
        "\nالرسالة: " +
        (error.message || "غير معروفة");

      setErrorMessage(message);

      alert("حدث خطأ أثناء حفظ الطالب\n\n" + message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (student) => {
    setErrorMessage("");

    setForm({
      name: student.name || "",
      guardianPhone: student.guardianPhone || "",
      groupId: student.groupId || "",
      registrationDate:
        student.registrationDate ||
        new Date().toISOString().split("T")[0],
      status: student.status || "active",
    });

    setEditingId(student.id);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (student) => {
    const confirmed = window.confirm(
      'هل أنت متأكد من حذف الطالب "' + student.name + '"؟'
    );

    if (!confirmed) return;

    try {
      setErrorMessage("");

      await deleteDoc(doc(db, "students", student.id));

      await loadData();

      alert("تم حذف الطالب");
    } catch (error) {
      console.error("STUDENT DELETE ERROR:", error);

      const message =
        "كود الخطأ: " +
        (error.code || "غير معروف") +
        "\nالرسالة: " +
        (error.message || "غير معروفة");

      setErrorMessage(message);

      alert("حدث خطأ أثناء حذف الطالب\n\n" + message);
    }
  };

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-3 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← العودة للوحة التحكم
            </button>

            <h1 className="text-2xl font-bold text-slate-800">
              إدارة الطلاب
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              إضافة الطلاب وربطهم بالمجموعات الحالية
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">

            {/* Student Report */}
            <button
              onClick={() =>
                router.push("/dashboard/student-report")
              }
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              📊 كشف الطلاب
            </button>

            {/* Add Student */}
            <button
              onClick={() => {
                setErrorMessage("");

                resetForm();

                setShowForm(true);
              }}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              + إضافة طالب
            </button>

          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <h2 className="mb-2 font-bold text-red-700">
              تفاصيل الخطأ
            </h2>

            <pre className="whitespace-pre-wrap text-sm leading-7 text-red-600">
              {errorMessage}
            </pre>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingId
                    ? "تعديل بيانات الطالب"
                    : "إضافة طالب جديد"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  أدخل البيانات الأساسية للطالب
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Student name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  اسم الطالب
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="مثال: أحمد محمد علي"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* Guardian phone */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  رقم ولي الأمر
                </label>

                <input
                  type="tel"
                  value={form.guardianPhone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      guardianPhone: e.target.value,
                    })
                  }
                  placeholder="مثال: 01012345678"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                />

                <p className="mt-2 text-xs text-slate-400">
                  سنستخدم الرقم لاحقًا لإرسال رسائل WhatsApp الخاصة بالحضور والاشتراكات.
                </p>
              </div>

              {/* Group + date */}
              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    المجموعة الحالية
                  </label>

                  <select
                    value={form.groupId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        groupId: e.target.value,
                      })
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">
                      اختر المجموعة
                    </option>

                    {groups
                      .filter((group) => group.status !== "inactive")
                      .map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                  </select>

                  {groups.length === 0 && (
                    <p className="mt-2 text-xs text-red-500">
                      لا توجد مجموعات. أضف مجموعة أولًا.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    تاريخ التسجيل
                  </label>

                  <input
                    type="date"
                    value={form.registrationDate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        registrationDate: e.target.value,
                      })
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

              </div>

              {/* Status */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  حالة الطالب
                </label>

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="active">
                    نشط
                  </option>

                  <option value="inactive">
                    غير نشط
                  </option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">

                <button
                  type="submit"
                  disabled={saving || groups.length === 0}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "جاري الحفظ..."
                    : editingId
                    ? "حفظ التعديلات"
                    : "إضافة الطالب"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="rounded-xl bg-slate-100 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  إلغاء
                </button>

              </div>
            </form>
          </div>
        )}

        {/* Students table */}
        <div className="rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-100 p-6">
            <div className="flex items-center justify-between">

              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  الطلاب المسجلون
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  إجمالي الطلاب: {students.length}
                </p>
              </div>

            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              جاري تحميل الطلاب...
            </div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center">

              <div className="mb-3 text-4xl">
                👨‍🎓
              </div>

              <h3 className="font-bold text-slate-700">
                لا يوجد طلاب حتى الآن
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                ابدأ بإضافة أول طالب للنظام
              </p>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1050px] text-right">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      الطالب
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      ولي الأمر
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      المجموعة الحالية
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      تاريخ التسجيل
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      الحالة
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      الإجراءات
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {students.map((student) => (

                    <tr
                      key={student.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >

                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {student.name}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {student.guardianPhone}
                      </td>

                      <td className="px-6 py-4">

                        <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                          {getGroupName(student.groupId)}
                        </span>

                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {student.registrationDate || "-"}
                      </td>

                      <td className="px-6 py-4">

                        {student.status === "active" ? (
                          <span className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                            نشط
                          </span>
                        ) : (
                          <span className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                            غير نشط
                          </span>
                        )}

                      </td>

                      <td className="px-6 py-4">

                        <div className="flex flex-wrap gap-2">

                          {/* Student Profile */}
                          <button
                            onClick={() =>
                              router.push(
                                "/dashboard/students/" + student.id
                              )
                            }
                            className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100"
                          >
                            ملف الطالب
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleEdit(student)}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
                          >
                            تعديل
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(student)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                          >
                            حذف
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </main>
  );
}