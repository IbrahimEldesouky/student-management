"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function StudentReportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("active");

  const loadGroups = async () => {
    try {
      const snapshot = await getDocs(collection(db, "groups"));

      const data = [];

      snapshot.forEach((doc) => {
        data.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      data.sort((a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || ""),
          "ar"
        )
      );

      setGroups(data);
    } catch (error) {
      console.error("Load groups error:", error);
    }
  };

  const loadStudents = async () => {
    try {
      setLoadingReport(true);

      const snapshot = await getDocs(
        collection(db, "students")
      );

      const data = [];

      snapshot.forEach((doc) => {
        data.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setStudents(data);
    } catch (error) {
      console.error("Load students error:", error);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/");
        return;
      }

      await loadGroups();
      await loadStudents();

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const getGroupName = (groupId) => {
    const group = groups.find(
      (item) => item.id === groupId
    );

    return group ? group.name : "غير محددة";
  };

  const filteredStudents = students.filter((student) => {
    const matchesGroup =
      !selectedGroup ||
      student.groupId === selectedGroup;

    const matchesStatus =
      selectedStatus === "all" ||
      student.status === selectedStatus;

    return matchesGroup && matchesStatus;
  });

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    const parts = String(date).split("-");

    if (parts.length === 3) {
      return parts[2] + "/" + parts[1] + "/" + parts[0];
    }

    return date;
  };

  const getStatusText = (status) => {
    if (status === "active") {
      return "نشط";
    }

    return "غير نشط";
  };

  const getStatusClass = (status) => {
    if (status === "active") {
      return "bg-emerald-100 text-emerald-700";
    }

    return "bg-slate-100 text-slate-600";
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToExcel = () => {
    const rows = [];

    rows.push([
      "م",
      "اسم الطالب",
      "المجموعة",
      "رقم ولي الأمر",
      "تاريخ التسجيل",
      "الحالة",
    ]);

    filteredStudents.forEach((student, index) => {
      rows.push([
        index + 1,
        student.name || "",
        getGroupName(student.groupId),
        student.guardianPhone || "",
        formatDate(student.registrationDate),
        getStatusText(student.status),
      ]);
    });

    const csvContent =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map((cell) => {
              const value = String(cell ?? "");
              return '"' + value.replace(/"/g, '""') + '"';
            })
            .join(",")
        )
        .join("\n");

    const blob = new Blob(
      [csvContent],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download =
      "كشف-طلاب-" +
      (selectedGroup
        ? getGroupName(selectedGroup)
        : "جميع-المجموعات") +
      ".csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-100 flex items-center justify-center"
      >
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-600 font-semibold">
            جاري تحميل التقرير...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
          <div>
            <button
              onClick={() => router.back()}
              className="mb-3 text-sm text-slate-500 hover:text-slate-800"
            >
              ← العودة
            </button>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
              كشف طلاب المجموعة
            </h1>

            <p className="text-slate-500 mt-1">
              عرض وطباعة وتصدير بيانات الطلاب
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              disabled={filteredStudents.length === 0}
              className="rounded-xl bg-slate-800 px-5 py-3 text-white font-semibold hover:bg-slate-900 disabled:opacity-50"
            >
              🖨️ طباعة
            </button>

            <button
              onClick={exportToExcel}
              disabled={filteredStudents.length === 0}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              📊 تصدير Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6 print:hidden">
          <h2 className="font-bold text-slate-800 mb-4">
            خيارات التقرير
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                المجموعة
              </label>

              <select
                value={selectedGroup}
                onChange={(e) =>
                  setSelectedGroup(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">
                  جميع المجموعات
                </option>

                {groups.map((group) => (
                  <option
                    key={group.id}
                    value={group.id}
                  >
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                حالة الطالب
              </label>

              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="active">
                  الطلاب النشطون
                </option>

                <option value="inactive">
                  الطلاب غير النشطين
                </option>

                <option value="all">
                  جميع الطلاب
                </option>
              </select>
            </div>

          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2">
            كشف طلاب المجموعة
          </h1>

          <p className="text-lg">
            {selectedGroup
              ? getGroupName(selectedGroup)
              : "جميع المجموعات"}
          </p>

          <p className="text-sm mt-2">
            الحالة:{" "}
            {selectedStatus === "active"
              ? "الطلاب النشطون"
              : selectedStatus === "inactive"
              ? "الطلاب غير النشطين"
              : "جميع الطلاب"}
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">
              عدد الطلاب
            </p>

            <p className="text-3xl font-bold text-slate-800 mt-2">
              {filteredStudents.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">
              الطلاب النشطون
            </p>

            <p className="text-3xl font-bold text-emerald-600 mt-2">
              {
                filteredStudents.filter(
                  (student) =>
                    student.status === "active"
                ).length
              }
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">
              المجموعة
            </p>

            <p className="text-xl font-bold text-slate-800 mt-2">
              {selectedGroup
                ? getGroupName(selectedGroup)
                : "كل المجموعات"}
            </p>
          </div>

        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

          <div className="p-5 border-b border-slate-200">
            <h2 className="font-bold text-slate-800">
              بيانات الطلاب
            </h2>
          </div>

          {loadingReport ? (
            <div className="p-10 text-center text-slate-500">
              جاري تحميل البيانات...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl mb-3">
                📋
              </div>

              <p className="text-slate-500">
                لا توجد بيانات مطابقة للبحث
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-4 text-center">
                      م
                    </th>

                    <th className="px-4 py-4 text-right">
                      اسم الطالب
                    </th>

                    <th className="px-4 py-4 text-right">
                      المجموعة
                    </th>

                    <th className="px-4 py-4 text-right">
                      رقم ولي الأمر
                    </th>

                    <th className="px-4 py-4 text-center">
                      تاريخ التسجيل
                    </th>

                    <th className="px-4 py-4 text-center">
                      الحالة
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {filteredStudents.map(
                    (student, index) => (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-4 py-4 text-center font-semibold">
                          {index + 1}
                        </td>

                        <td className="px-4 py-4 font-semibold text-slate-800">
                          {student.name || "-"}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {getGroupName(
                            student.groupId
                          )}
                        </td>

                        <td
                          dir="ltr"
                          className="px-4 py-4 text-slate-600 text-right"
                        >
                          {student.guardianPhone ||
                            "-"}
                        </td>

                        <td className="px-4 py-4 text-center text-slate-600">
                          {formatDate(
                            student.registrationDate
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span
                            className={
                              "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                              getStatusClass(
                                student.status
                              )
                            }
                          >
                            {getStatusText(
                              student.status
                            )}
                          </span>
                        </td>
                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* Print Footer */}
        <div className="hidden print:flex justify-between mt-8 text-sm text-slate-600">
          <span>
            إجمالي الطلاب:{" "}
            {filteredStudents.length}
          </span>

          <span>
            تاريخ الطباعة:{" "}
            {new Date().toLocaleDateString("ar-EG")}
          </span>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }

          body {
            background: white !important;
          }

          main {
            background: white !important;
            padding: 0 !important;
          }

          table {
            font-size: 12px;
          }

          th,
          td {
            border-color: #d1d5db !important;
          }
        }
      `}</style>
    </main>
  );
}