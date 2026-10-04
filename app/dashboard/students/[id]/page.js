"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useParams, useRouter } from "next/navigation";

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();

  const studentId = params.id;

  const [student, setStudent] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupHistory, setGroupHistory] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(
    function () {
      if (studentId) {
        loadStudentData();
      }
    },
    [studentId]
  );

  async function loadStudentData() {
    try {
      setLoading(true);
      setError("");

      var studentsSnapshot = await getDocs(
        collection(db, "students")
      );

      var studentDoc = studentsSnapshot.docs.find(function (item) {
        return item.id === studentId;
      });

      if (!studentDoc) {
        setError("الطالب غير موجود.");
        setLoading(false);
        return;
      }

      var studentData = {
        id: studentDoc.id,
        ...studentDoc.data(),
      };

      setStudent(studentData);

      var groupsSnapshot = await getDocs(
        collection(db, "groups")
      );

      var groupsData = groupsSnapshot.docs.map(function (item) {
        return {
          id: item.id,
          ...item.data(),
        };
      });

      setGroups(groupsData);

      var historyQuery = query(
        collection(db, "studentGroupHistory"),
        where("studentId", "==", studentId)
      );

      var historySnapshot = await getDocs(historyQuery);

      var historyData = historySnapshot.docs.map(function (item) {
        return {
          id: item.id,
          ...item.data(),
        };
      });

      historyData.sort(function (a, b) {
        return String(b.startDate || "").localeCompare(
          String(a.startDate || "")
        );
      });

      setGroupHistory(historyData);

      var attendanceQuery = query(
        collection(db, "attendance"),
        where("studentId", "==", studentId)
      );

      var attendanceSnapshot = await getDocs(attendanceQuery);

      var attendanceData = attendanceSnapshot.docs.map(function (item) {
        return {
          id: item.id,
          ...item.data(),
        };
      });

      attendanceData.sort(function (a, b) {
        return String(b.date || "").localeCompare(
          String(a.date || "")
        );
      });

      setAttendance(attendanceData);

      var subscriptionsQuery = query(
        collection(db, "subscriptions"),
        where("studentId", "==", studentId)
      );

      var subscriptionsSnapshot = await getDocs(
        subscriptionsQuery
      );

      var subscriptionsData = subscriptionsSnapshot.docs.map(
        function (item) {
          return {
            id: item.id,
            ...item.data(),
          };
        }
      );

      subscriptionsData.sort(function (a, b) {
        return String(b.month || "").localeCompare(
          String(a.month || "")
        );
      });

      setSubscriptions(subscriptionsData);

      var paymentsQuery = query(
        collection(db, "payments"),
        where("studentId", "==", studentId)
      );

      var paymentsSnapshot = await getDocs(paymentsQuery);

      var paymentsData = paymentsSnapshot.docs.map(function (item) {
        return {
          id: item.id,
          ...item.data(),
        };
      });

      paymentsData.sort(function (a, b) {
        return String(b.paymentDate || "").localeCompare(
          String(a.paymentDate || "")
        );
      });

      setPayments(paymentsData);
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تحميل ملف الطالب.");
    } finally {
      setLoading(false);
    }
  }

  function getGroupName(groupId) {
    var group = groups.find(function (item) {
      return item.id === groupId;
    });

    return group ? group.name : "غير محددة";
  }

  function getMonthName(monthValue) {
    if (!monthValue) {
      return "-";
    }

    var parts = monthValue.split("-");

    if (parts.length !== 2) {
      return monthValue;
    }

    var year = parts[0];
    var month = Number(parts[1]);

    var names = [
      "",
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ];

    return names[month] + " " + year;
  }

  function getAttendanceStatusText(status) {
    if (status === "present") {
      return "حاضر";
    }

    if (status === "absent") {
      return "غائب";
    }

    return status || "-";
  }

  function getAttendanceStatusClass(status) {
    if (status === "present") {
      return "bg-green-100 text-green-700";
    }

    if (status === "absent") {
      return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-600";
  }

  function getSubscriptionStatusText(status) {
    if (status === "paid") {
      return "مدفوع بالكامل";
    }

    if (status === "partial") {
      return "مدفوع جزئيًا";
    }

    return "غير مدفوع";
  }

  function getSubscriptionStatusClass(status) {
    if (status === "paid") {
      return "bg-green-100 text-green-700";
    }

    if (status === "partial") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-red-100 text-red-700";
  }

  function getPaymentsForSubscription(subscriptionId) {
    return payments.filter(function (payment) {
      return payment.subscriptionId === subscriptionId;
    });
  }

  function formatDate(dateValue) {
    if (!dateValue) {
      return "-";
    }

    var parts = String(dateValue).split("-");

    if (parts.length !== 3) {
      return dateValue;
    }

    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  var presentCount = attendance.filter(function (item) {
    return item.status === "present";
  }).length;

  var absentCount = attendance.filter(function (item) {
    return item.status === "absent";
  }).length;

  var attendanceTotal = presentCount + absentCount;

  var attendancePercentage =
    attendanceTotal > 0
      ? Math.round((presentCount / attendanceTotal) * 100)
      : 0;

  var totalDue = subscriptions.reduce(function (sum, item) {
    return sum + Number(item.dueAmount || 0);
  }, 0);

  var totalPaid = subscriptions.reduce(function (sum, item) {
    return sum + Number(item.totalPaid || 0);
  }, 0);

  var totalRemaining = subscriptions.reduce(function (sum, item) {
    return sum + Number(item.remainingAmount || 0);
  }, 0);

  var totalPaymentOperations = payments.length;

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 flex items-center justify-center"
      >
        <div className="text-xl font-bold text-slate-700">
          جاري تحميل ملف الطالب...
        </div>
      </main>
    );
  }

  if (error || !student) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 p-6"
      >
        <div className="max-w-3xl mx-auto">

          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">

            <div className="text-5xl mb-4">
              ⚠️
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mb-3">
              {error || "الطالب غير موجود"}
            </h1>

            <button
              onClick={function () {
                router.push("/dashboard/students");
              }}
              className="bg-slate-800 text-white px-6 py-3 rounded-xl hover:bg-slate-700"
            >
              العودة للطلاب
            </button>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-8"
    >
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              ملف الطالب
            </h1>

            <p className="text-slate-500 mt-2">
              عرض شامل لبيانات الطالب وحضوره واشتراكاته
            </p>
          </div>

          <button
            onClick={function () {
              router.push("/dashboard/students");
            }}
            className="bg-slate-800 text-white px-5 py-3 rounded-xl hover:bg-slate-700"
          >
            العودة لقائمة الطلاب
          </button>

        </div>

        {/* بيانات الطالب */}

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            <div>

              <div className="flex items-center gap-3 flex-wrap">

                <h2 className="text-3xl font-bold text-slate-800">
                  {student.name}
                </h2>

                <span
                  className={
                    student.status === "active"
                      ? "bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold"
                      : "bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold"
                  }
                >
                  {student.status === "active"
                    ? "نشط"
                    : "غير نشط"}
                </span>

              </div>

              <p className="text-slate-500 mt-2">
                رقم الطالب: {student.id}
              </p>

            </div>

            <div className="bg-blue-50 rounded-2xl px-6 py-4">

              <p className="text-slate-500 text-sm mb-1">
                المجموعة الحالية
              </p>

              <p className="text-xl font-bold text-blue-700">
                {getGroupName(student.groupId)}
              </p>

            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-500 mb-1">
                ولي الأمر
              </p>

              <p className="font-bold text-slate-800">
                {student.guardianPhone || "غير مسجل"}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-500 mb-1">
                تاريخ التسجيل
              </p>

              <p className="font-bold text-slate-800">
                {formatDate(student.registrationDate)}
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-500 mb-1">
                المجموعة الحالية
              </p>

              <p className="font-bold text-slate-800">
                {getGroupName(student.groupId)}
              </p>
            </div>

          </div>

        </div>

        {/* الإحصائيات */}

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 text-sm mb-2">
              إجمالي الحصص
            </p>

            <p className="text-2xl font-bold text-slate-800">
              {attendanceTotal}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 text-sm mb-2">
              الحضور
            </p>

            <p className="text-2xl font-bold text-green-600">
              {presentCount}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 text-sm mb-2">
              الغياب
            </p>

            <p className="text-2xl font-bold text-red-600">
              {absentCount}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 text-sm mb-2">
              نسبة الحضور
            </p>

            <p className="text-2xl font-bold text-blue-600">
              {attendancePercentage}%
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 text-sm mb-2">
              إجمالي المدفوع
            </p>

            <p className="text-2xl font-bold text-green-600">
              {totalPaid} جنيه
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 text-sm mb-2">
              إجمالي المتبقي
            </p>

            <p className="text-2xl font-bold text-red-600">
              {totalRemaining} جنيه
            </p>
          </div>

        </div>

        {/* سجل المجموعات */}

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">

          <div className="mb-5">

            <h2 className="text-2xl font-bold text-slate-800">
              سجل المجموعات
            </h2>

            <p className="text-slate-500 mt-1">
              تاريخ انتقال الطالب بين المجموعات
            </p>

          </div>

          {groupHistory.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-500">
              لا يوجد سجل لتغيير المجموعات.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[650px]">

                <thead className="bg-slate-100">

                  <tr>
                    <th className="p-4 text-right">
                      المجموعة
                    </th>

                    <th className="p-4 text-right">
                      من تاريخ
                    </th>

                    <th className="p-4 text-right">
                      إلى تاريخ
                    </th>

                    <th className="p-4 text-right">
                      الحالة
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {groupHistory.map(function (history) {

                    var isCurrent = !history.endDate;

                    return (
                      <tr
                        key={history.id}
                        className="border-t border-slate-100"
                      >

                        <td className="p-4 font-bold text-slate-800">
                          {getGroupName(history.groupId)}
                        </td>

                        <td className="p-4">
                          {formatDate(history.startDate)}
                        </td>

                        <td className="p-4">
                          {history.endDate
                            ? formatDate(history.endDate)
                            : "حتى الآن"}
                        </td>

                        <td className="p-4">

                          <span
                            className={
                              isCurrent
                                ? "bg-green-100 text-green-700 px-3 py-2 rounded-full text-sm font-bold"
                                : "bg-slate-100 text-slate-600 px-3 py-2 rounded-full text-sm font-bold"
                            }
                          >
                            {isCurrent
                              ? "المجموعة الحالية"
                              : "مجموعة سابقة"}
                          </span>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* الحضور */}

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">

          <div className="mb-5">

            <h2 className="text-2xl font-bold text-slate-800">
              سجل الحضور
            </h2>

            <p className="text-slate-500 mt-1">
              جميع مرات حضور وغياب الطالب
            </p>

          </div>

          {attendance.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-500">
              لا توجد سجلات حضور حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[700px]">

                <thead className="bg-slate-100">

                  <tr>

                    <th className="p-4 text-right">
                      التاريخ
                    </th>

                    <th className="p-4 text-right">
                      اليوم
                    </th>

                    <th className="p-4 text-right">
                      المجموعة
                    </th>

                    <th className="p-4 text-right">
                      الحالة
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {attendance.map(function (item) {

                    var dateObject = new Date(
                      String(item.date) + "T00:00:00"
                    );

                    var dayName = dateObject.toLocaleDateString(
                      "ar-EG",
                      {
                        weekday: "long",
                      }
                    );

                    return (
                      <tr
                        key={item.id}
                        className="border-t border-slate-100"
                      >

                        <td className="p-4 font-bold">
                          {formatDate(item.date)}
                        </td>

                        <td className="p-4">
                          {dayName}
                        </td>

                        <td className="p-4">
                          {getGroupName(item.groupId)}
                        </td>

                        <td className="p-4">

                          <span
                            className={
                              "px-3 py-2 rounded-full text-sm font-bold " +
                              getAttendanceStatusClass(item.status)
                            }
                          >
                            {getAttendanceStatusText(item.status)}
                          </span>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* الاشتراكات */}

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">

          <div className="mb-5">

            <h2 className="text-2xl font-bold text-slate-800">
              الاشتراكات والمدفوعات
            </h2>

            <p className="text-slate-500 mt-1">
              السجل المالي للطالب
            </p>

          </div>

          {subscriptions.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-500">
              لا توجد اشتراكات مسجلة لهذا الطالب.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px]">

                <thead className="bg-slate-100">

                  <tr>

                    <th className="p-4 text-right">
                      الشهر
                    </th>

                    <th className="p-4 text-right">
                      المستحق
                    </th>

                    <th className="p-4 text-right">
                      المدفوع
                    </th>

                    <th className="p-4 text-right">
                      المتبقي
                    </th>

                    <th className="p-4 text-right">
                      الحالة
                    </th>

                    <th className="p-4 text-right">
                      عدد الدفعات
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {subscriptions.map(function (subscription) {

                    var subscriptionPayments =
                      getPaymentsForSubscription(subscription.id);

                    return (
                      <tr
                        key={subscription.id}
                        className="border-t border-slate-100"
                      >

                        <td className="p-4 font-bold">
                          {getMonthName(subscription.month)}
                        </td>

                        <td className="p-4">
                          {subscription.dueAmount} جنيه
                        </td>

                        <td className="p-4 font-bold text-green-600">
                          {subscription.totalPaid} جنيه
                        </td>

                        <td className="p-4 font-bold text-red-600">
                          {subscription.remainingAmount} جنيه
                        </td>

                        <td className="p-4">

                          <span
                            className={
                              "px-3 py-2 rounded-full text-sm font-bold " +
                              getSubscriptionStatusClass(
                                subscription.status
                              )
                            }
                          >
                            {getSubscriptionStatusText(
                              subscription.status
                            )}
                          </span>

                        </td>

                        <td className="p-4">
                          {subscriptionPayments.length}
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* كل عمليات الدفع */}

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">

            <div>

              <h2 className="text-2xl font-bold text-slate-800">
                سجل عمليات الدفع
              </h2>

              <p className="text-slate-500 mt-1">
                جميع عمليات السداد الخاصة بالطالب
              </p>

            </div>

            <div className="bg-green-50 rounded-xl px-5 py-3">

              <span className="text-slate-500">
                عدد العمليات:
              </span>

              <strong className="mr-2 text-green-700">
                {totalPaymentOperations}
              </strong>

            </div>

          </div>

          {payments.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-500">
              لا توجد عمليات دفع مسجلة.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[850px]">

                <thead className="bg-slate-100">

                  <tr>

                    <th className="p-4 text-right">
                      التاريخ
                    </th>

                    <th className="p-4 text-right">
                      الشهر
                    </th>

                    <th className="p-4 text-right">
                      المبلغ
                    </th>

                    <th className="p-4 text-right">
                      طريقة الدفع
                    </th>

                    <th className="p-4 text-right">
                      ملاحظات
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {payments.map(function (payment) {

                    var paymentSubscription =
                      subscriptions.find(function (subscription) {
                        return subscription.id === payment.subscriptionId;
                      });

                    return (
                      <tr
                        key={payment.id}
                        className="border-t border-slate-100"
                      >

                        <td className="p-4 font-bold">
                          {formatDate(payment.paymentDate)}
                        </td>

                        <td className="p-4">
                          {paymentSubscription
                            ? getMonthName(
                                paymentSubscription.month
                              )
                            : "-"}
                        </td>

                        <td className="p-4 font-bold text-green-600">
                          {payment.amount} جنيه
                        </td>

                        <td className="p-4">

                          <span className="bg-slate-100 px-3 py-2 rounded-full text-sm">
                            {payment.method || "-"}
                          </span>

                        </td>

                        <td className="p-4 text-slate-600">
                          {payment.notes || "-"}
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* ملخص مالي */}

        <div className="bg-slate-800 text-white rounded-2xl p-6">

          <h2 className="text-2xl font-bold mb-5">
            الملخص المالي
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="bg-white/10 rounded-xl p-5">

              <p className="text-slate-300 mb-2">
                إجمالي المستحق
              </p>

              <p className="text-3xl font-bold">
                {totalDue} جنيه
              </p>

            </div>

            <div className="bg-white/10 rounded-xl p-5">

              <p className="text-slate-300 mb-2">
                إجمالي المدفوع
              </p>

              <p className="text-3xl font-bold text-green-300">
                {totalPaid} جنيه
              </p>

            </div>

            <div className="bg-white/10 rounded-xl p-5">

              <p className="text-slate-300 mb-2">
                إجمالي المتبقي
              </p>

              <p className="text-3xl font-bold text-red-300">
                {totalRemaining} جنيه
              </p>

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}