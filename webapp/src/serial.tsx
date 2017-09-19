/// <reference path="../../localtypings/smoothie.d.ts" />

import * as React from "react"
import * as pkg from "./package"
import * as core from "./core"
import * as srceditor from "./srceditor"
import * as sui from "./sui"
import * as codecard from "./codecard"
import * as canvaschart from "./canvaschart"

import Cloud = pxt.Cloud
import Util = pxt.Util

const lf = Util.lf

export class Editor extends srceditor.Editor {

    private chartWrappers: Chart[] = []
    private chartIdx: number = 0
    private consoleEntries: string[] = []
    private consoleBuffer: string = ""
    // TODO pass these values in with props or config?
    private shouldScroll = false
    private isSim: boolean = true
    private maxLineLength: number = 500
    private maxConsoleEntries: number = 100
    private active: boolean = true

    getId() {
        return "serialEditor"
    }

    acceptsFile(file: pkg.File) {
        // TODO hardcoded string
        return file.name === pxt.SERIAL_EDITOR_FILE
    }

    isGraphable(v: string) {
        return /[a-z]*:[0-9.]*/.test(v)
    }

    setSim(b: boolean) {
        this.isSim = b
        this.clear()
    }

    constructor(public parent: pxt.editor.IProjectView) {
        super(parent)
        window.addEventListener("message", this.processMessage.bind(this), false)
    }

    processMessage(ev: MessageEvent) {
        let msg = ev.data
        if (this.active && msg.type === "serial") {
            const smsg = msg as pxsim.SimulatorSerialMessage
            const sim = !!smsg.sim
            if (sim == this.isSim) {
                const data = smsg.data || ""
                const source = smsg.id || "?"
                let theme = source.split("-")[0] || "black"

                if (this.isGraphable(data)) {
                    this.appendGraphEntry(source, data, theme, sim)
                } else {
                    this.appendConsoleEntry(data)
                }
            }
        }
    }

    appendGraphEntry(source: string, data: string, theme: string, sim: boolean) {
        let m = /^\s*(([^:]+):)?\s*(-?\d+)/i.exec(data)
        let variable = m ? (m[2] || ' ') : undefined
        let nvalue = m ? parseInt(m[3]) : null

        //See if there is a "home chart" that this point belongs to -
        //if not, create a new chart
        let homeChart: Chart = undefined
        for (let i = 0; i < this.chartWrappers.length; ++i) {
            let chartWrapper = this.chartWrappers[i]
            if (chartWrapper.shouldContain(source, variable)) {
                homeChart = chartWrapper
                break
            }
        }
        if (homeChart) {
            homeChart.addPoint(nvalue)
        } else {
            let newChart = new Chart(source, variable, nvalue, this.chartIdx)
            this.chartIdx++
            this.chartWrappers.push(newChart)
            let serialChartRoot = document.getElementById("serialCharts")
            serialChartRoot.appendChild(newChart.getElement())
            /**
            let c = serialChartRoot.lastChild.childNodes[1] as HTMLCanvasElement
            c.width = c.offsetWidth
            c.height = c.offsetHeight
            **/
            //TODO
            //let c = newChart.getCanvas()
            //c.width = c.offsetWidth 
            //c.height = c.offsetHeight
        }
    }

    appendConsoleEntry(data: string) {
        for (let i = 0; i < data.length; ++i) {
            let ch = data[i]
            this.consoleBuffer += ch
            if (ch === "\n" || this.consoleBuffer.length > this.maxLineLength) {
                let newEntry = document.createElement("div")
                newEntry.textContent = this.consoleBuffer
                let consoleRoot = document.getElementById("serialConsole")
                consoleRoot.appendChild(newEntry)
                if (consoleRoot.childElementCount > this.maxConsoleEntries) {
                    consoleRoot.removeChild(consoleRoot.firstChild)
                }
                this.consoleBuffer = ""
            }
        }
    }

    pauseRecording() {
        this.chartWrappers.forEach(s => s.stop())
    }

    startRecording() {
        this.chartWrappers.forEach(s => s.start())
    }

    toggleRecording() {
        if (this.active) {
            this.active = false
            this.pauseRecording()
            //TODO nooooooooo
            document.getElementById("serialRecordButton").className="play icon"
        } else {
            this.active = true
            this.startRecording()
            document.getElementById("serialRecordButton").className="pause icon"
        }
    }

    clearNode(e: HTMLElement) {
        while (e.hasChildNodes()) {
            e.removeChild(e.firstChild)
        }
    }

    clear() {
        let chartRoot = document.getElementById("serialCharts")
        let consoleRoot = document.getElementById("serialConsole")
        this.clearNode(chartRoot)
        this.clearNode(consoleRoot)
        this.chartWrappers = []
        this.consoleEntries = []
        this.consoleBuffer = ""
    }

    entriesToCSV(){
        //TODO add graphable entries
        return this.consoleEntries.join(",")
    }

    showStreamDialog() {
        const targetTheme = pxt.appTarget.appTheme;        
        let rootUrl = targetTheme.embedUrl
        if (!rootUrl) {
            //TODO csv is empty
            pxt.commands.browserDownloadAsync(this.entriesToCSV(), "data.csv", 'text/csv')
            return;
        }
        if (!/\/$/.test(rootUrl)) rootUrl += '/';

        core.confirmAsync({
            logos: undefined,
            header: lf("Analyze Data"),
            hideAgree: true,
            disagreeLbl: lf("Close"),
            onLoaded: (_) => {
                _.find('#datasavelocalfile').click(() => {
                    _.modal('hide');
                    pxt.commands.browserDownloadAsync(this.entriesToCSV(), "data.csv", 'text/csv')
                })
            },
            htmlBody:`
                <div></div>
                <div class="ui cards" role="listbox">
                    <div class="ui card">
                        <div class="content">
                            <div class="header">${lf("Local File")}</div>
                            <div class="description">
                                ${lf("Save the data to your 'Downloads' folder.")}
                            </div>
                        </div>
                        <div id="datasavelocalfile" class="ui bottom attached button">
                            <i class="download icon"></i>
                            ${lf("Download data")}
                        </div>        
                    </div>
                </div>`
        }).done();
    }

    display() {
        return (
            <div id="serialArea">
                <div id="serialHeader" className="ui segment">
                    <span className="ui huge left aligned header">{this.isSim ? lf("Simulator") : lf("Device")}</span>
                    <button className="ui left floated icon button" onClick={this.showStreamDialog.bind(this)}>
                        <i className="download icon"></i>
                    </button>
                    <button className="ui right floated icon button" onClick ={this.toggleRecording.bind(this)}>
                        <i id="serialRecordButton" className={this.active ? "pause icon" : "play icon"}></i>
                    </button>
                </div>
                <div id="serialCharts"></div>
                <div className="ui fitted divider"></div>
                <div id="serialConsole"></div>
            </div>
            /**
            <div id="serialEditor" className="ui grid">
                <div className="four column row">
                    <div className="left floated column">
                        <div className="ui huge header">{this.isSim ? lf("Simulator") : lf("Device")}</div>
                    </div>
                    <div className="right floated column">
                        <button className="ui icon button" onClick = {() => {this.active = true; this.startRecording()}}>
                            <i className="play icon"></i>
                        </button>
                        <button className="ui icon button" onClick = {() => {this.active = false; this.pauseRecording()}}>
                            <i className="pause icon"></i>
                        </button>
                    </div>
                </div>
                <div className="row">
                    <div id="charts" className="ui one column grid"></div>
                </div>
                <div id="console" className="row">
                </div>
            </div>
            **/
            /**
            <div id="serialEditor" className="ui grid">
                <div className="ui segment">
                    <span id="serialEditorTitle" className="ui huge left aligned header">{this.isSim ? lf("Simulator") : lf("Device")}</span>
                    <button className="ui right floated icon button" onClick= {() => {this.active = false; this.pauseRecording()}}>
                        <i className="pause icon"></i>
                    </button>
                    <button className="ui right floated icon button" onClick = {() => {this.active = true; this.startRecording()}}>
                        <i className="play icon"></i>
                    </button>
                </div>
                <div id="charts" className="ui"></div>
                <div id="console" className="ui content"></div>
            </div>
            **/
        )
    }

    domUpdate() {
        //TODO
    }
}

class Chart {
    private rootElement: HTMLElement = document.createElement("div")
    private canvas: HTMLCanvasElement = undefined
    //private labelElement: HTMLElement
    //private element: HTMLCanvasElement
    private line: TimeSeries = new TimeSeries()
    private source: string
    private variable: string
    private chartConfig = { 
        responsive: true,
        interpolation: "linear",
        fps: 30, 
        millisPerPixel: 20, 
        grid: { strokeStyle: '#555555', lineWidth: 1, millisPerLine: 1000, verticalSections: 4}
    }
    private chart: SmoothieChart = new SmoothieChart(this.chartConfig)
    //private lineConfig =  {strokeStyle: 'rgba(0, 255, 0, 1)', fillStyle: 'rgba(0, 255, 0, 0.2)', lineWidth: 4}
    private lineConfigs = [
        { strokeStyle: 'rgba(255, 0, 0, 1)', fillStyle: 'rgba(255, 0, 0, 0.2)', lineWidth: 4 },
        { strokeStyle: 'rgba(0, 0, 255, 1)', fillStyle: 'rgba(0, 0, 255, 0.2)', lineWidth: 4 },
        { strokeStyle: 'rgba(0, 255, 0, 1)', fillStyle: 'rgba(0, 255, 0, 0.2)', lineWidth: 4 },
        { strokeStyle: 'rgba(255, 255, 0, 1)', fillStyle: 'rgba(255, 255, 0, 0.2)', lineWidth: 4 }
    ]
    

    constructor(source: string, variable: string, value: number, chartIdx: number) {
        this.rootElement.className = "ui segment"
        this.source = source
        this.variable = variable
        this.chart.addTimeSeries(this.line, this.lineConfigs[chartIdx%4])

        let canvas = this.makeCanvas()
        //this.chart.streamTo(canvas)

        let label = this.makeLabel()
        this.rootElement.appendChild(label)
        this.rootElement.appendChild(canvas)

        this.addPoint(value)
    }

    public makeLabel() {
        let label = document.createElement("div")
        label.className = "ui top left huge attached label"
        label.innerText = this.variable
        return label
    }

    public makeCanvas() {
        let canvas = document.createElement("canvas")
        this.chart.streamTo(canvas)
        //canvas.width = canvas.offsetWidth
        //canvas.height = canvas.offsetHeight
        this.canvas = canvas
        return canvas
    }

    public getCanvas() {
        return this.canvas
    }
    public getElement() {
        return this.rootElement
    }

    public shouldContain(source: string, variable: string) {
        return this.source == source && this.variable == variable
    }

    public addPoint(value: number) {
        this.line.append(new Date().getTime(), value)
    }

    public start() {
        this.chart.start()
    }

    public stop() {
        this.chart.stop()
    }
}