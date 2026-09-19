import logging
import logging.handlers
import queue

from colorama import Fore, Style

from src.core.config import settings

LEVEL_COLORS = {
    logging.DEBUG: Fore.CYAN,
    logging.INFO: Fore.GREEN,
    logging.WARNING: Fore.YELLOW,
    logging.ERROR: Fore.RED,
    logging.CRITICAL: Fore.RED + Style.BRIGHT,
}


class ColoredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        color = LEVEL_COLORS.get(record.levelno, "")
        reset = Style.RESET_ALL
        level = f"{color}{record.levelname:<8}{reset}"
        return f"{level} [{record.name} - {self.formatTime(record)}] {record.getMessage()}"


def setup_logging() -> None:
    """Настраивает асинхронное логирование через очередь с цветным выводом в консоль."""
    log_queue: queue.Queue = queue.Queue()
    queue_handler = logging.handlers.QueueHandler(log_queue)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(ColoredFormatter())

    listener = logging.handlers.QueueListener(log_queue, console_handler)
    listener.start()

    root = logging.getLogger()
    root.setLevel(getattr(logging, settings.LOGGING_LEVEL, logging.INFO))
    root.addHandler(queue_handler)

    # Приглушаем шумные логгеры сторонних библиотек
    for name in ("uvicorn.access", "asyncpg"):
        logging.getLogger(name).setLevel(logging.WARNING)
