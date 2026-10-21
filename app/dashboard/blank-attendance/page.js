
"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const DAYS = {
  saturday: "السبت",
  sunday: "الأحد",
  monday: "الإثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
};

const getLocalMonth = () => {
  const now = new Date();
  return (
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0")
  );
};

const getTrainingDates = (month, trainingDays) => {
  if (!month || !Array.isArray(trainingDays)) return [];

  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const dates = [];

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, monthNumber - 1, day);
    const dayKey = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][date.getDay()];

    if (trainingDays.includes(dayKey)) {
      dates.push({
        day,
        dayName: DAYS[dayKey],
        dateLabel: String(day).padStart(2, "0"),
        fullDate:
          year +
          "-" +
          String(monthNumber).padStart(2, "0") +
          "-" +
          String(day).padStart(2, "0"),
      });
    }
  }

  return dates;
};

export default function BlankAttendancePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getLocalMonth());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        setLoading(true);

        const [groupsSnapshot, studentsSnapshot] = await Promise.all([
          getDocs(collection(db, "groups")),
          getDocs(collection(db, "students")),
        ]);

        const groupsData = groupsSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((group) => group.status !== "inactive")
          .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

        const studentsData = studentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setGroups(groupsData);
        setStudents(studentsData);

        setSelectedGroup((current) => {
          if (current && groupsData.some((group) => group.id === current)) {
            return current;
          }

          return groupsData.length > 0 ? groupsData[0].id : "";
        });
      } catch (error) {
        console.error("Error loading attendance report:", error);
        alert("حصل خطأ أثناء تحميل بيانات المجموعات والطلاب.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const currentGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroup),
    [groups, selectedGroup]
  );

  const groupStudents = useMemo(() => {
    return students
      .filter(
        (student) =>
          student.groupId === selectedGroup &&
          student.status !== "inactive"
      )
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
  }, [students, selectedGroup]);

  const trainingDates = useMemo(() => {
    return getTrainingDates(
      selectedMonth,
      currentGroup?.trainingDays || []
    );
  }, [selectedMonth, currentGroup]);

  const formattedMonth = useMemo(() => {
    if (!selectedMonth) return "";

    const [year, month] = selectedMonth.split("-");
    return month + "/" + year;
  }, [selectedMonth]);

  const exportToExcel = () => {
    if (!currentGroup) {
      alert("من فضلك اختار المجموعة أولًا.");
      return;
    }

    if (trainingDates.length === 0) {
      alert("مفيش أيام تدريب مسجلة للمجموعة خلال الشهر المحدد.");
      return;
    }

    const rows = [
      ["كشف الحضور الشهري"],
      ["المجموعة", currentGroup.name || "", "الشهر", formattedMonth],
      [],
      [
        "م",
        "اسم الطالب",
        ...trainingDates.map(
          (date) => date.dateLabel + " - " + date.dayName
        ),
      ],
      ...groupStudents.map((student, index) => [
        index + 1,
        student.name || "",
        ...trainingDates.map(() => ""),
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 28 },
      ...trainingDates.map(() => ({ wch: 15 })),
    ];

    worksheet["!merges"] = [
      {
        s: { r: 0, c: 0 },
        e: { r: 0, c: trainingDates.length + 1 },
      },
    ];

    worksheet["!views"] = [{ rightToLeft: true }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "كشف الحضور");

    XLSX.writeFile(
      workbook,
      "كشف-الحضور-" + selectedMonth + ".xlsx"
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600">
        جاري تحميل البيانات...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body {
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          #blank-attendance-print,
          #blank-attendance-print * {
            visibility: visible;
          }

          #blank-attendance-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          #blank-attendance-print table {
            width: 100%;
            border-collapse: collapse;
            direction: rtl;
          }

          #blank-attendance-print th,
          #blank-attendance-print td {
            border: 1px solid black !important;
            color: black !important;
            padding: 5px 3px !important;
            font-size: 10px !important;
          }

          #blank-attendance-print th {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #blank-attendance-print td {
            height: 30px;
          }
        }
      `}</style>

      <div className="no-print rounded-xl border bg-white p-5 shadow-sm">
        <h1 className="mb-5 text-2xl font-bold text-gray-800">
          كشف الحضور الفاضي
        </h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block font-medium text-gray-700">
              المجموعة
            </label>

            <select
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
              className="w-full rounded-lg border p-3 outline-none focus:border-blue-500"
            >
              <option value="">اختر المجموعة</option>

              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-700">
              الشهر
            </label>

            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full rounded-lg border p-3 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!currentGroup || trainingDates.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              طباعة الكشف
            </button>

            <button
              type="button"
              onClick={exportToExcel}
              disabled={!currentGroup || trainingDates.length === 0}
              className="rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              تصدير Excel
            </button>
          </div>
        </div>
      </div>

      <div
        id="blank-attendance-print"
        className="rounded-xl border bg-white p-4 shadow-sm md:p-6"
      >
        <div className="mb-5 text-center">
          <h2 className="text-xl font-bold text-gray-900">
            كشف الحضور الشهري
          </h2>

          {currentGroup && (
            <p className="mt-2 text-gray-700">
              المجموعة: {currentGroup.name}
              {" — "}
              الشهر: {formattedMonth}
            </p>
          )}
        </div>

        {!currentGroup ? (
          <p className="py-8 text-center text-gray-500">
            مفيش مجموعات متاحة. أضف مجموعة أولًا.
          </p>
        ) : trainingDates.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            مفيش أيام تدريب مسجلة للمجموعة خلال الشهر المحدد.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center text-sm">
              <thead>
                <tr>
                  <th className="border border-black bg-gray-100 p-2">
                    م
                  </th>

                  <th className="min-w-48 border border-black bg-gray-100 p-2">
                    اسم الطالب
                  </th>

                  {trainingDates.map((date) => (
                    <th
                      key={date.fullDate}
                      className="min-w-16 border border-black bg-gray-100 p-2"
                    >
                      <div>{date.dateLabel}</div>
                      <div className="text-xs font-normal">
                        {date.dayName}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {groupStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={trainingDates.length + 2}
                      className="border border-black p-6 text-gray-500"
                    >
                      مفيش طلاب نشطين في المجموعة دي.
                    </td>
                  </tr>
                ) : (
                  groupStudents.map((student, index) => (
                    <tr key={student.id}>
                      <td className="border border-black p-2">
                        {index + 1}
                      </td>

                      <td className="border border-black p-2 text-right">
                        {student.name}
                      </td>

                      {trainingDates.map((date) => (
                        <td
                          key={date.fullDate}
                          className="h-9 border border-black p-2"
                        ></td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 hidden justify-between text-sm print:flex">
          <span>توقيع المدرب: ........................</span>
          <span>اعتماد المسؤول: ........................</span>
        </div>
      </div>
    </div>
  );
}
