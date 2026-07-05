"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const common_1 = require("@nestjs/common");
// import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
const jwt_auth_guard_1 = require("../../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const notification_service_1 = require("../services/notification.service");
const debug_logger_service_1 = require("../services/debug-logger.service");
const notification_query_dto_1 = require("../dto/notification-query.dto");
const notification_not_found_exception_1 = require("../exceptions/notification-not-found.exception");
// @ApiTags('notifications')
// @ApiBearerAuth()
let NotificationController = class NotificationController {
    constructor(notificationService, debugLogger) {
        this.notificationService = notificationService;
        this.debugLogger = debugLogger;
    }
    async getUserNotifications(options, currentUser) {
        const userId = currentUser.sub;
        const result = await this.notificationService.findByUser(userId, options);
        this.debugLogger.logNotificationEvent('notifications_list_returned', { total: result.total, page: result.page, pageSize: result.pageSize }, userId);
        return result;
    }
    async getUnreadCount(currentUser) {
        const userId = currentUser.sub;
        const count = await this.notificationService.getUnreadCount(userId);
        return { count };
    }
    async getUserStats(currentUser) {
        const userId = currentUser.sub;
        return this.notificationService.getUserStats(userId);
    }
    async searchNotifications(searchTerm, options = {}, currentUser) {
        const userId = currentUser.sub;
        return this.notificationService.searchNotifications(userId, searchTerm, options);
    }
    async getNotificationById(id, currentUser) {
        const userId = currentUser.sub;
        const notification = await this.notificationService.findById(id, userId);
        if (!notification) {
            throw new notification_not_found_exception_1.NotificationNotFoundException(id);
        }
        return notification;
    }
    async markAsRead(id, currentUser) {
        const userId = currentUser.sub;
        await this.notificationService.markAsRead(id, userId);
        this.debugLogger.logNotificationEvent('notification_marked_as_read', { id }, userId);
    }
    async markAllAsRead(currentUser) {
        const userId = currentUser.sub;
        await this.notificationService.markAllAsRead(userId);
        this.debugLogger.logNotificationEvent('notifications_marked_all_read', {}, userId);
    }
    async deleteNotification(id, currentUser) {
        const userId = currentUser.sub;
        await this.notificationService.delete(id, userId);
        this.debugLogger.logNotificationEvent('notification_deleted', { id }, userId);
    }
    // Endpoints administrativos
    // @ApiOperation({ summary: 'Limpar notificações expiradas (admin)' })
    // @ApiResponse({ status: 200, description: 'Limpeza concluída' })
    async cleanupExpired() {
        await this.notificationService.deleteExpired();
        return { message: 'Expired notifications cleaned up successfully' };
    }
    // @ApiOperation({ summary: 'Limpar notificações antigas (admin)' })
    // @ApiResponse({ status: 200, description: 'Limpeza concluída' })
    async cleanupOldNotifications(daysToKeep = 90) {
        const deletedCount = await this.notificationService.cleanupOldNotifications(daysToKeep);
        return {
            message: 'Old notifications cleaned up successfully',
            deletedCount,
        };
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_c = typeof notification_query_dto_1.NotificationQueryDto !== "undefined" && notification_query_dto_1.NotificationQueryDto) === "function" ? _c : Object, typeof (_d = typeof Express !== "undefined" && Express.User) === "function" ? _d : Object]),
    __metadata("design:returntype", typeof (_e = typeof Promise !== "undefined" && Promise) === "function" ? _e : Object)
], NotificationController.prototype, "getUserNotifications", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_f = typeof Express !== "undefined" && Express.User) === "function" ? _f : Object]),
    __metadata("design:returntype", typeof (_g = typeof Promise !== "undefined" && Promise) === "function" ? _g : Object)
], NotificationController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_h = typeof Express !== "undefined" && Express.User) === "function" ? _h : Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUserStats", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, typeof (_j = typeof notification_query_dto_1.NotificationQueryDto !== "undefined" && notification_query_dto_1.NotificationQueryDto) === "function" ? _j : Object, typeof (_k = typeof Express !== "undefined" && Express.User) === "function" ? _k : Object]),
    __metadata("design:returntype", typeof (_l = typeof Promise !== "undefined" && Promise) === "function" ? _l : Object)
], NotificationController.prototype, "searchNotifications", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, typeof (_m = typeof Express !== "undefined" && Express.User) === "function" ? _m : Object]),
    __metadata("design:returntype", typeof (_o = typeof Promise !== "undefined" && Promise) === "function" ? _o : Object)
], NotificationController.prototype, "getNotificationById", null);
__decorate([
    (0, common_1.Put)(':id/read'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, typeof (_p = typeof Express !== "undefined" && Express.User) === "function" ? _p : Object]),
    __metadata("design:returntype", typeof (_q = typeof Promise !== "undefined" && Promise) === "function" ? _q : Object)
], NotificationController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Put)('read-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_r = typeof Express !== "undefined" && Express.User) === "function" ? _r : Object]),
    __metadata("design:returntype", typeof (_s = typeof Promise !== "undefined" && Promise) === "function" ? _s : Object)
], NotificationController.prototype, "markAllAsRead", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, typeof (_t = typeof Express !== "undefined" && Express.User) === "function" ? _t : Object]),
    __metadata("design:returntype", typeof (_u = typeof Promise !== "undefined" && Promise) === "function" ? _u : Object)
], NotificationController.prototype, "deleteNotification", null);
__decorate([
    (0, common_1.Get)('admin/cleanup')
    // @ApiOperation({ summary: 'Limpar notificações expiradas (admin)' })
    // @ApiResponse({ status: 200, description: 'Limpeza concluída' })
    ,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", typeof (_v = typeof Promise !== "undefined" && Promise) === "function" ? _v : Object)
], NotificationController.prototype, "cleanupExpired", null);
__decorate([
    (0, common_1.Post)('admin/cleanup-old')
    // @ApiOperation({ summary: 'Limpar notificações antigas (admin)' })
    // @ApiResponse({ status: 200, description: 'Limpeza concluída' })
    ,
    __param(0, (0, common_1.Body)('daysToKeep')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", typeof (_w = typeof Promise !== "undefined" && Promise) === "function" ? _w : Object)
], NotificationController.prototype, "cleanupOldNotifications", null);
exports.NotificationController = NotificationController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [typeof (_a = typeof notification_service_1.NotificationService !== "undefined" && notification_service_1.NotificationService) === "function" ? _a : Object, typeof (_b = typeof debug_logger_service_1.DebugLoggerService !== "undefined" && debug_logger_service_1.DebugLoggerService) === "function" ? _b : Object])
], NotificationController);
