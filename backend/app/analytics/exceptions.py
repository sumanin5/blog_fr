from app.core.exceptions import BaseAppException


class AnalyticsError(BaseAppException):
    pass


class EventCreateError(AnalyticsError):
    def __init__(self, message: str = "Failed to create analytics event"):
        super().__init__(
            message=message, status_code=500, error_code="EVENT_CREATE_ERROR"
        )
