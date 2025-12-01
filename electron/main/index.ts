import { app, BrowserWindow, ipcMain } from "electron";
import { electronApp } from "@electron-toolkit/utils";
import { isMac } from "./utils/config";
import { unregisterShortcuts } from "./shortcut";
import { initTray, MainTray } from "./tray";
import { processLog } from "./logger";
import initAppServer from "../server";
import loadWindow from "./windows/load-window";
import mainWindow from "./windows/main-window";
import initIpc from "./ipc";

// 屏蔽报错
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

// 主进程
class MainProcess {
  // 窗口
  mainWindow: BrowserWindow | null = null;
  loadWindow: BrowserWindow | null = null;
  // 托盘
  mainTray: MainTray | null = null;
  // 是否退出
  isQuit: boolean = false;
  // 启动时传入的 orpheus URL
  launchOrpheusUrl: string | null = null;
  // 前端是否已就绪
  frontendReady: boolean = false;

  constructor() {
    processLog.info("🚀 Main process startup");
    // 注册自定义协议（必须在 app.ready 之前）
    this.registerProtocol();
    // 初始化单例锁
    this.initSingleInstanceLock();
    // 处理启动参数中的 orpheus:// URL
    this.parseOrpheusUrlFromArguments();
    // 监听应用事件
    this.handleAppEvents();
    // 监听前端就绪事件
    this.setupFrontendReadyListener();
    // Electron 初始化完成后
    app.whenReady().then(async () => {
      processLog.info("🚀 Application Process Startup");
      // 设置应用程序名称
      electronApp.setAppUserModelId("com.imsyy.splayer");
      // 启动主服务进程
      await initAppServer();
      // 启动窗口
      this.loadWindow = loadWindow.create();
      this.mainWindow = mainWindow.create();
      // 注册其他服务
      this.mainTray = initTray(this.mainWindow!);
      // 注册 IPC 通信
      initIpc();
      // 监听主窗口加载完成事件
      if (this.mainWindow) {
        this.mainWindow.webContents.once("did-finish-load", () => {
          processLog.info("Main window loaded, waiting for frontend ready");
          // 处理启动时的 orpheus URL（等待前端就绪）
          if (this.launchOrpheusUrl) {
            this.waitForFrontendReady(() => {
              processLog.info("Frontend ready, handling orpheus protocol");
              this.handleOrpheusProtocol(this.launchOrpheusUrl!);
            });
          }
          // 销毁加载窗口
          if (this.loadWindow && !this.loadWindow.isDestroyed()) {
            this.loadWindow.destroy();
            this.loadWindow = null;
          }
          // 显示主窗口
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          }
        });
      }
    });
  }

  // 设置前端就绪监听器
  private setupFrontendReadyListener(): void {
    ipcMain.on("frontend-ready", () => {
      processLog.info("✅ Frontend is ready");
      this.frontendReady = true;
    });
  }

  // 等待前端就绪
  private waitForFrontendReady(callback: () => void): void {
    if (this.frontendReady) {
      // 前端已就绪，立即执行
      callback();
    } else {
      // 前端未就绪，设置超时等待（3秒）
      const timeoutId = setTimeout(() => {
        processLog.warn("Frontend ready timeout, proceeding anyway");
        callback();
      }, 3000);

      // 监听前端就绪事件
      const handleReady = () => {
        clearTimeout(timeoutId);
        ipcMain.off("frontend-ready", handleReady);
        callback();
      };
      ipcMain.once("frontend-ready", handleReady);
    }
  }

  // 注册自定义协议
  registerProtocol() {
    try {
      if (process.defaultApp) {
        // 开发环境
        if (process.argv.length >= 2) {
          app.setAsDefaultProtocolClient("orpheus", process.execPath, [process.argv[1]]);
        }
      } else {
        // 生产环境
        app.setAsDefaultProtocolClient("orpheus");
      }
      processLog.info("✅ Orpheus protocol registered successfully");
    } catch (error) {
      processLog.error("Failed to register orpheus protocol:", error);
    }
  }

  // 初始化单例锁
  initSingleInstanceLock() {
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      app.quit();
      processLog.warn("❌ Another instance is already running");
    } else {
      // 当第二个实例启动时触发
      app.on("second-instance", (_, commandLine) => {
        processLog.info("Second instance triggered");
        // 从命令行参数中查找 orpheus:// URL
        const orpheusUrl = commandLine.find((arg) => arg.startsWith("orpheus://"));
        if (orpheusUrl && this.mainWindow && !this.mainWindow.isDestroyed()) {
          processLog.info("Handling orpheus protocol from second instance");
          this.handleOrpheusProtocol(orpheusUrl);
        }
        // 显示主窗口
        if (this.mainWindow) {
          if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore();
          }
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      });
    }
  }

  // 从命令行参数解析 orpheus URL
  parseOrpheusUrlFromArguments() {
    if (process.argv && process.argv.length > 0) {
      const orpheusUrl = process.argv.find((arg) => arg.startsWith("orpheus://"));
      if (orpheusUrl) {
        this.launchOrpheusUrl = orpheusUrl;
        processLog.info("Found orpheus URL in launch arguments");
      }
    }
  }

  // 处理 orpheus:// 协议
  handleOrpheusProtocol(url: string) {
    try {
      // 提取 base64 编码的数据部分
      const encodedData = url.replace("orpheus://", "");
      if (!encodedData) {
        processLog.warn("Empty orpheus protocol data");
        return;
      }

      // Base64 解码
      const decodedData = Buffer.from(encodedData, "base64").toString("utf-8");
      const orpheusData = JSON.parse(decodedData);

      processLog.info("Orpheus protocol data:", orpheusData);

      // 发送给前端处理
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send("handle-orpheus-protocol", orpheusData);
        // 确保窗口可见并获得焦点
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore();
        }
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    } catch (error) {
      processLog.error("Failed to handle orpheus protocol:", error);
    }
  }

  // 应用程序事件
  handleAppEvents() {
    // 窗口被关闭时
    app.on("window-all-closed", () => {
      if (!isMac) {
        app.quit();
      }
      this.mainWindow = null;
      this.loadWindow = null;
    });

    // 应用被激活
    app.on("activate", () => {
      const allWindows = BrowserWindow.getAllWindows();
      if (allWindows.length) {
        allWindows[0].focus();
      }
    });

    // 处理 open-url 事件（macOS 上的协议处理）
    app.on("open-url", (event, url) => {
      event.preventDefault();
      if (url.startsWith("orpheus://")) {
        this.handleOrpheusProtocol(url);
      }
    });

    // 将要退出
    app.on("will-quit", () => {
      // 注销全部快捷键
      unregisterShortcuts();
    });

    // 退出前
    app.on("before-quit", () => {
      this.isQuit = true;
    });
  }
}

export default new MainProcess();
