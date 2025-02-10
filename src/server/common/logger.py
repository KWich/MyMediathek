"""
Server Logging

SPDX-FileCopyrightText: 2025 Klaus Wich
SPDX-License-Identifier: EUPL-1.2
"""

import logging
import sys


class Logger:
  """
  Logger class.
  """

  FORMAT = " * %(asctime)s %(levelname)-5s: %(message)s"
  DATE = "%H:%M:%S"
  __log = None
  APP = "Mediathek"

  @staticmethod
  def getDefault():
    """
    Return default instance of Logger
    @return Logger
    """
    if Logger.__log is None:
      logger = logging.getLogger(Logger.APP)

      handler = logging.StreamHandler(sys.stdout)
      formater = logging.Formatter(Logger.FORMAT, Logger.DATE)
      handler.setFormatter(formater)
      logger.addHandler(handler)
      logger.setLevel(logging.DEBUG)

      Logger.__log = logging.getLogger(Logger.APP)
    return Logger.__log

  @staticmethod
  def warning(msg, *args):
    """
    Log warning message
    @parma msg as str
    """
    Logger.getDefault().warning(msg, *args)

  @staticmethod
  def debug(msg, *args):
    """
    Log debug message
    @parma msg as str
    """
    Logger.getDefault().debug(msg, *args)

  @staticmethod
  def info(msg, *args):
    """
    Log info message.
    @parma msg as str
    """
    Logger.getDefault().info(msg, *args)

  @staticmethod
  def error(msg, *args):
    """
    Log error message.
    @parma msg as str
    """
    Logger.getDefault().error(msg, *args)
