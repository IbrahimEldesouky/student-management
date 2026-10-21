
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";
import { useRouter } from "next/navigation";

export default function DailyPaymentsPage() {
  const router = useRouter();

  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [groups, setGroups] = useState([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(function () {
    const unsubscribe = onAuthStateChanged(auth, function (user) {
      if (!user) {
        router.replace("/");
        return;
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");

      setSelectedDate(year + "-" + month + "-" + day);
      loadData();
    });

    return function () {
      unsubscribe();
    };
  }, [router]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const results = await Promise.all([
        getDocs(collection(db, "payments")),
        getDocs(collection(db, "students")),
        getDocs(collection(db, "subscriptions")),
        getDocs(collection(db, "groups")),
      ]);

      setPayments(
        results[0].docs.map(function (item) {
          return { id: item.id, ...item.data() };
        })
      );

      setStudents(
        results[1].docs.map(function (item) {
          return { id: item.id, ...item.data() };
        })
      );

      setSubscriptions(
        results[2].docs.map(function (item) {
          return { id: item.id, ...item.data() };
        })
      );

      setGroups(
        results[3].docs.map(function (item) {
          return { id: item.id, ...item.data() };
        })
      );
    } catch (err) {
      console.error("Daily payments report error:", err);
      setError("حدث خطأ أثناء تحميل بيانات المدفوعات.");
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString("ar-EG");
  }

  function getStudentName(payment) {
    const student = students.find(function (item) {
      return item.id === payment.studentId;
    });

    return (
      payment.studentName ||
      (student && student.name) ||
      "طالب غير معروف"
    );
  }

  function getGroupName(payment) {
    const subscription = subscriptions.find(function (item) {
      return item.id === payment.subscriptionId;
    });

    const groupId = subscription ? subscription.groupId : "";
    const group = groups.find(function (item) {
      return item.id === groupId;
    });

    return group ? group.name : "بدون مجموعة";
  }

  const rows = payments
    .filter(function (payment) {
      return payment.paymentDate === selectedDate;
    })
    .map(function (payment) {
      return {
        ...payment,
        displayName: getStudentName(payment),
        groupName: getGroupName(payment),
        amountNumber: Number(payment.amount || 0),
      };
    })
    .sort(function (a, b) {
      return a.displayName.localeCompare(b.displayName, "ar");
    });

  const totalCollected = rows.reduce(function (sum, payment) {
    return sum + payment.amountNumber;
  }, 0);

  const cashTotal = rows.reduce(function (sum, payment) {
    return sum + (
      payment.method === "كاش" ? payment.amountNumber : 0
    );
  }, 0);

  const transferTotal = rows.reduce(function (sum, payment) {
    return sum + (
      payment.method === "تحويل" ? payment.amountNumber : 0
    );
  }, 0);

  const otherTotal = rows.reduce(function (sum, payment) {
    return sum + (
      payment.method !== "كاش" &&
      payment.method !== "تحويل"
        ? payment.amountNumber
        : 0
    );
  }, 0);

  function exportCSV() {
    const headers = [
      "م",
      "اسم الطالب",
      "المجموعة",
      "المبلغ",
      "طريقة الدفع",
      "تاريخ الدفع",
      "ملاحظات",
    ];

    const data = rows.map(function (payment, index) {
      return [
        index + 1,
        payment.displayName,
        payment.groupName,
        payment.amountNumber,
        payment.method || "أخرى",
        payment.paymentDate || "",
        payment.notes || "",
      ];
    });

    const csvEscape = function (value) {
      return '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"';
    };

    const csvContent = [headers]
      .concat(data)
      .map(function (row) {
        return row.map(csvEscape).join(",");
      })
      .join("\r\n");

    const blob = new Blob(
      ["\uFEFF" + csvContent],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "تقرير-التحصيل-" + selectedDate + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm print:hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                تقرير التحصيل اليومي
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                عرض جميع الدفعات المسجلة في تاريخ محدد
              </p>
            </div>

            <button
              onClick={function () {
                router.push("/dashboard");
              }}
              className="rounded-xl bg-slate-100 px-5 py-3 font-medium text-slate-700 hover:bg-slate-200"
            >
              العودة للوحة التحكم
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm print:hidden">
          <label className="mb-2 block font-bold text-slate-700">
            اختر تاريخ التحصيل
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={function (event) {
              setSelectedDate(event.target.value);
            }}
            className="w-full rounded-xl border border-slate-300 p-3 sm:max-w-sm"
          />
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 print:hidden">
            {error}
          </div>
        )}

        <section id="daily-payments-print">
          <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-center text-xl font-bold text-slate-800">
              تقرير التحصيل اليومي
            </h2>

            <p className="mt-2 text-center text-slate-600">
              تاريخ التقرير: {selectedDate || "لم يتم اختيار تاريخ"}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-sm text-blue-700">إجمالي التحصيل</p>
                <p className="mt-2 text-2xl font-bold text-blue-800">
                  {formatMoney(totalCollected)} جنيه
                </p>
              </div>

              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-sm text-green-700">تحصيل نقدي</p>
                <p className="mt-2 text-2xl font-bold text-green-800">
                  {formatMoney(cashTotal)} جنيه
                </p>
              </div>

              <div className="rounded-xl bg-purple-50 p-4">
                <p className="text-sm text-purple-700">تحصيل بالتحويل</p>
                <p className="mt-2 text-2xl font-bold text-purple-800">
                  {formatMoney(transferTotal)} جنيه
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-sm text-amber-700">طرق دفع أخرى</p>
                <p className="mt-2 text-2xl font-bold text-amber-800">
                  {formatMoney(otherTotal)} جنيه
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  تفاصيل الدفعات
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  عدد العمليات: {rows.length}
                </p>
              </div>

              <div className="flex gap-2 print:hidden">
                <button
                  onClick={printReport}
                  disabled={loading}
                  className="rounded-xl bg-slate-800 px-4 py-3 font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  🖨️ طباعة التقرير
                </button>

                <button
                  onClick={exportCSV}
                  disabled={loading}
                  className="rounded-xl bg-green-600 px-4 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  تصدير CSV
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-500">
                جاري تحميل بيانات التقرير...
              </div>
            ) : rows.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                لا توجد دفعات مسجلة في هذا التاريخ.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-right">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-4">م</th>
                      <th className="px-4 py-4">اسم الطالب</th>
                      <th className="px-4 py-4">المجموعة</th>
                      <th className="px-4 py-4">المبلغ</th>
                      <th className="px-4 py-4">طريقة الدفع</th>
                      <th className="px-4 py-4">التاريخ</th>
                      <th className="px-4 py-4">ملاحظات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map(function (payment, index) {
                      return (
                        <tr
                          key={payment.id}
                          className="border-t border-slate-100"
                        >
                          <td className="px-4 py-4">{index + 1}</td>
                          <td className="px-4 py-4 font-bold text-slate-800">
                            {payment.displayName}
                          </td>
                          <td className="px-4 py-4">
                            {payment.groupName}
                          </td>
                          <td className="px-4 py-4 font-bold text-green-700">
                            {formatMoney(payment.amountNumber)} جنيه
                          </td>
                          <td className="px-4 py-4">
                            {payment.method || "أخرى"}
                          </td>
                          <td className="px-4 py-4">
                            {payment.paymentDate || "-"}
                          </td>
                          <td className="px-4 py-4">
                            {payment.notes || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot className="bg-slate-50">
                    <tr>
                      <td
                        colSpan="3"
                        className="px-4 py-4 font-bold"
                      >
                        إجمالي التحصيل
                      </td>
                      <td className="px-4 py-4 font-bold text-green-700">
                        {formatMoney(totalCollected)} جنيه
                      </td>
                      <td colSpan="3" className="px-4 py-4">
                        عدد الدفعات: {rows.length}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

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

          #daily-payments-print,
          #daily-payments-print * {
            visibility: visible;
          }

          #daily-payments-print {
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
          }

          #daily-payments-print .shadow-sm {
            box-shadow: none !important;
          }

          #daily-payments-print table {
            width: 100%;
            min-width: 0 !important;
            border-collapse: collapse;
          }

          #daily-payments-print th,
          #daily-payments-print td {
            border: 1px solid #cbd5e1;
            padding: 7px;
            font-size: 11px;
            color: #111827 !important;
          }

          #daily-payments-print thead {
            display: table-header-group;
          }

          #daily-payments-print tr {
            break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}
