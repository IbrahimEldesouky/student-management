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
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const days = [
  { value: "saturday", label: "السبت" },
  { value: "sunday", label: "الأحد" },
  { value: "monday", label: "الإثنين" },
  { value: "tuesday", label: "الثلاثاء" },
  { value: "wednesday", label: "الأربعاء" },
  { value: "thursday", label: "الخميس" },
  { value: "friday", label: "الجمعة" },
];

export default function GroupsPage() {
  const router = useRouter();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [errorMessage, setErrorMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    trainingDays: [],
    startTime: "",
    endTime: "",
    status: "active",
    capacity: "",
  });

  const loadGroups = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const snapshot = await getDocs(collection(db, "groups"));

      const groupsData = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      groupsData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      setGroups(groupsData);
    } catch (error) {
      console.error("LOAD GROUPS ERROR:", error);

      const message = `كود الخطأ: ${
        error.code || "غير معروف"
      }\nالرسالة: ${error.message || "غير معروفة"}`;

      setErrorMessage(message);
      alert(`حدث خطأ أثناء تحميل المجموعات\n\n${message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      trainingDays: [],
      startTime: "",
      endTime: "",
      status: "active",
      capacity: "",
    });

    setEditingId(null);
  };

  const handleDayChange = (day) => {
    setForm((prev) => {
      const exists = prev.trainingDays.includes(day);

      return {
        ...prev,
        trainingDays: exists
          ? prev.trainingDays.filter((item) => item !== day)
          : [...prev.trainingDays, day],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMessage("");

    if (!form.name.trim()) {
      alert("من فضلك أدخل اسم المجموعة");
      return;
    }

    if (form.trainingDays.length === 0) {
      alert("من فضلك اختر يوم تدريب واحد على الأقل");
      return;
    }

    if (!form.startTime) {
      alert("من فضلك حدد وقت بداية التدريب");
      return;
    }

    try {
      setSaving(true);

      const groupData = {
        name: form.name.trim(),
        trainingDays: form.trainingDays,
        startTime: form.startTime,
        endTime: form.endTime,
        status: form.status,
        capacity: form.capacity ? Number(form.capacity) : null,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "groups", editingId), groupData);
      } else {
        await addDoc(collection(db, "groups"), {
          ...groupData,
          createdAt: serverTimestamp(),
        });
      }

      const wasEditing = Boolean(editingId);

      resetForm();
      setShowForm(false);

      await loadGroups();

      alert(
        wasEditing
          ? "تم تعديل المجموعة بنجاح"
          : "تم إضافة المجموعة بنجاح"
      );
    } catch (error) {
      console.error("GROUP SAVE ERROR:", error);

      const message = `كود الخطأ: ${
        error.code || "غير معروف"
      }\nالرسالة: ${error.message || "غير معروفة"}`;

      setErrorMessage(message);

      alert(`حدث خطأ أثناء حفظ المجموعة\n\n${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (group) => {
    setErrorMessage("");

    setForm({
      name: group.name || "",
      trainingDays: group.trainingDays || [],
      startTime: group.startTime || "",
      endTime: group.endTime || "",
      status: group.status || "active",
      capacity: group.capacity || "",
    });

    setEditingId(group.id);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (group) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف مجموعة "${group.name}"؟`
    );

    if (!confirmed) return;

    try {
      setErrorMessage("");

      await deleteDoc(doc(db, "groups", group.id));

      await loadGroups();

      alert("تم حذف المجموعة");
    } catch (error) {
      console.error("GROUP DELETE ERROR:", error);

      const message = `كود الخطأ: ${
        error.code || "غير معروف"
      }\nالرسالة: ${error.message || "غير معروفة"}`;

      setErrorMessage(message);

      alert(`حدث خطأ أثناء حذف المجموعة\n\n${message}`);
    }
  };

  const getDayLabel = (value) => {
    const day = days.find((item) => item.value === value);
    return day ? day.label : value;
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
              إدارة المجموعات
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              إضافة وتنظيم مجموعات التدريب ومواعيدها
            </p>
          </div>

          <button
            onClick={() => {
              setErrorMessage("");
              resetForm();
              setShowForm(true);
            }}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            + إضافة مجموعة
          </button>
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
                  {editingId ? "تعديل المجموعة" : "إضافة مجموعة جديدة"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  أدخل بيانات ومواعيد المجموعة
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
              {/* Group name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  اسم المجموعة
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
                  placeholder="مثال: المجموعة الأولى"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* Training days */}
              <div>
                <label className="mb-3 block text-sm font-medium text-slate-700">
                  أيام التدريب
                </label>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {days.map((day) => {
                    const selected = form.trainingDays.includes(day.value);

                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleDayChange(day.value)}
                        className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    بداية التدريب
                  </label>

                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    نهاية التدريب
                  </label>

                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        endTime: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Status + capacity */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    حالة المجموعة
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
                    <option value="active">نشطة</option>
                    <option value="inactive">غير نشطة</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    الحد الأقصى للطلاب
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        capacity: e.target.value,
                      })
                    }
                    placeholder="اختياري"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "جاري الحفظ..."
                    : editingId
                    ? "حفظ التعديلات"
                    : "إضافة المجموعة"}
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

        {/* Groups */}
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  المجموعات المسجلة
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  إجمالي المجموعات: {groups.length}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              جاري تحميل المجموعات...
            </div>
          ) : groups.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mb-3 text-4xl">📚</div>

              <h3 className="font-bold text-slate-700">
                لا توجد مجموعات حتى الآن
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                ابدأ بإضافة أول مجموعة تدريبية
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-right">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      المجموعة
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      أيام التدريب
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      الوقت
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      الحالة
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      السعة
                    </th>

                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {groups.map((group) => (
                    <tr
                      key={group.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {group.name}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex flex-wrap gap-1">
                          {(group.trainingDays || []).map((day) => (
                            <span
                              key={day}
                              className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-700"
                            >
                              {getDayLabel(day)}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {group.startTime || "-"}
                        {group.endTime ? ` - ${group.endTime}` : ""}
                      </td>

                      <td className="px-6 py-4">
                        {group.status === "active" ? (
                          <span className="rounded-lg bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                            نشطة
                          </span>
                        ) : (
                          <span className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                            غير نشطة
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {group.capacity || "غير محدد"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(group)}
                            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
                          >
                            تعديل
                          </button>

                          <button
                            onClick={() => handleDelete(group)}
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