import Order from '../model/order.model.js';
import Purchase from '../model/purchase.model.js';
import Client from '../model/client.model.js';

function buildDomainError(code, field = null) {
    const err = new Error(code);
    err.code = code;
    err.field = field;
    return err;
}

function parseDateOrThrow(value, fieldName) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw buildDomainError('INVALID_DATE', fieldName);
    }

    return date;
}

function getDateRange(from, to) {
    const now = new Date();
    const end = parseDateOrThrow(to, 'to') || now;
    const start = parseDateOrThrow(from, 'from') || new Date(end.getTime() - (29 * 24 * 60 * 60 * 1000));

    if (start > end) {
        throw buildDomainError('INVALID_DATE_RANGE', 'from');
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return {start, end};
}

function buildCreatedAtMatch(from, to) {
    return {
        createdAt: {
            $gte: from, $lte: to,
        },
    };
}

function getPeriodFormat(groupBy) {
    if (groupBy === 'day') return '%Y-%m-%d';
    return '%Y-%m';
}

function addPeriod(date, groupBy) {
    const next = new Date(date);
    if (groupBy === 'day') {
        next.setDate(next.getDate() + 1);
        return next;
    }

    next.setMonth(next.getMonth() + 1);
    return next;
}

function createPeriodIndex(from, to, groupBy) {
    const format = getPeriodFormat(groupBy);
    const periods = [];
    const cursor = new Date(from);

    while (cursor <= to) {
        if (format === '%Y-%m-%d') {
            const day = String(cursor.getDate()).padStart(2, '0');
            const month = String(cursor.getMonth() + 1).padStart(2, '0');
            periods.push(`${cursor.getFullYear()}-${month}-${day}`);
        } else {
            const month = String(cursor.getMonth() + 1).padStart(2, '0');
            periods.push(`${cursor.getFullYear()}-${month}`);
        }

        const nextCursor = addPeriod(cursor, groupBy);
        cursor.setTime(nextCursor.getTime());
    }

    return periods;
}

function toMap(items, valueField) {
    return new Map(items.map((item) => [item._id, Number(item[valueField] || 0)]));
}

async function getIncomeSeries({from, to, groupBy, timezone}) {
    const format = getPeriodFormat(groupBy);

    return Order.aggregate([{
        $match: {
            ...buildCreatedAtMatch(from, to), estado: {$ne: 'cancelado'},
        },
    }, {
        $group: {
            _id: {
                $dateToString: {format, date: '$createdAt', timezone},
            }, total: {$sum: '$total'},
        },
    }, {$sort: {_id: 1}},]);
}

async function getExpenseSeries({from, to, groupBy, timezone}) {
    const format = getPeriodFormat(groupBy);

    return Purchase.aggregate([{$match: buildCreatedAtMatch(from, to)}, {
        $group: {
            _id: {
                $dateToString: {format, date: '$createdAt', timezone},
            }, total: {$sum: '$total'},
        },
    }, {$sort: {_id: 1}},]);
}

async function getNewClientsSeries({from, to, groupBy, timezone}) {
    const format = getPeriodFormat(groupBy);

    return Client.aggregate([{$match: buildCreatedAtMatch(from, to)}, {
        $group: {
            _id: {
                $dateToString: {format, date: '$createdAt', timezone},
            }, total: {$sum: 1},
        },
    }, {$sort: {_id: 1}},]);
}

export async function getOverviewReportService({from, to}) {
    const {start, end} = getDateRange(from, to);
    const dateMatch = buildCreatedAtMatch(start, end);

    const [incomeResult, expenseResult, totalOrders, totalPurchases, newClients] = await Promise.all([Order.aggregate([{
        $match: {
            ...dateMatch, estado: {$ne: 'cancelado'}
        }
    }, {$group: {_id: null, total: {$sum: '$total'}}},]), Purchase.aggregate([{$match: dateMatch}, {
        $group: {
            _id: null, total: {$sum: '$total'}
        }
    },]), Order.countDocuments({
        ...dateMatch, estado: {$ne: 'cancelado'}
    }), Purchase.countDocuments(dateMatch), Client.countDocuments(dateMatch),]);

    const totalIncome = Number(incomeResult[0]?.total || 0);
    const totalExpense = Number(expenseResult[0]?.total || 0);
    const balance = Number((totalIncome - totalExpense).toFixed(2));
    const averageTicket = totalOrders > 0 ? Number((totalIncome / totalOrders).toFixed(2)) : 0;

    return {
        success: true, data: {
            rango: {
                desde: start.toISOString(), hasta: end.toISOString(),
            }, contadores: {
                ingresos_totales: totalIncome,
                gastos_totales: totalExpense,
                balance,
                pedidos_totales: totalOrders,
                compras_totales: totalPurchases,
                clientes_nuevos: newClients,
                ticket_promedio: averageTicket,
            },
        },
    };
}

export async function getSeriesReportService({from, to, groupBy = 'month', timezone = 'UTC'}) {
    const safeGroupBy = groupBy === 'day' ? 'day' : 'month';
    const {start, end} = getDateRange(from, to);

    const [incomeSeries, expenseSeries, clientsSeries] = await Promise.all([getIncomeSeries({
        from: start, to: end, groupBy: safeGroupBy, timezone
    }), getExpenseSeries({from: start, to: end, groupBy: safeGroupBy, timezone}), getNewClientsSeries({
        from: start, to: end, groupBy: safeGroupBy, timezone
    }),]);

    const periods = createPeriodIndex(start, end, safeGroupBy);
    const incomeMap = toMap(incomeSeries, 'total');
    const expenseMap = toMap(expenseSeries, 'total');
    const clientsMap = toMap(clientsSeries, 'total');

    const points = periods.map((periodo) => {
        const ingresos = Number(incomeMap.get(periodo) || 0);
        const gastos = Number(expenseMap.get(periodo) || 0);
        const clientes_nuevos = Number(clientsMap.get(periodo) || 0);

        return {
            periodo, ingresos, gastos, balance: Number((ingresos - gastos).toFixed(2)), clientes_nuevos,
        };
    });

    return {
        success: true, data: {
            rango: {
                desde: start.toISOString(), hasta: end.toISOString(),
            }, agrupacion: safeGroupBy, serie: points,
        },
    };
}

export async function getTopProductsReportService({from, to, limit = 10}) {
    const {start, end} = getDateRange(from, to);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));

    const sold = await Order.aggregate([{
        $match: {
            ...buildCreatedAtMatch(start, end), estado: {$ne: 'cancelado'},
        },
    }, {$unwind: '$productos'}, {
        $group: {
            _id: '$productos.codigo',
            nombre: {$first: '$productos.nombre'},
            cantidad: {$sum: '$productos.cantidad'},
            ingresos: {$sum: '$productos.subtotal'},
        },
    }, {$sort: {cantidad: -1, ingresos: -1}}, {$limit: safeLimit},]);

    const bought = await Purchase.aggregate([{$match: buildCreatedAtMatch(start, end)}, {$unwind: '$productos'}, {
        $group: {
            _id: '$productos.codigo',
            nombre: {$first: '$productos.nombre'},
            cantidad: {$sum: '$productos.cantidad'},
            gastos: {$sum: '$productos.subtotal'},
        },
    }, {$sort: {cantidad: -1, gastos: -1}}, {$limit: safeLimit},]);

    return {
        success: true, data: {
            rango: {
                desde: start.toISOString(), hasta: end.toISOString(),
            }, mas_vendidos: sold.map((item) => ({
                codigo: item._id,
                nombre: item.nombre,
                cantidad: Number(item.cantidad || 0),
                ingresos: Number(item.ingresos || 0),
            })), mas_comprados: bought.map((item) => ({
                codigo: item._id,
                nombre: item.nombre,
                cantidad: Number(item.cantidad || 0),
                gastos: Number(item.gastos || 0),
            })),
        },
    };
}

export async function getDashboardReportService({
                                                    from, to, groupBy = 'month', timezone = 'UTC', limit = 10,
                                                }) {
    const [overview, series, topProducts] = await Promise.all([getOverviewReportService({
        from, to
    }), getSeriesReportService({from, to, groupBy, timezone}), getTopProductsReportService({from, to, limit}),]);

    return {
        success: true, data: {
            rango: overview.data.rango,
            contadores: overview.data.contadores,
            agrupacion: series.data.agrupacion,
            serie: series.data.serie,
            mas_vendidos: topProducts.data.mas_vendidos,
            mas_comprados: topProducts.data.mas_comprados,
        },
    };
}


