/// <reference path="../../built/pxtlib.d.ts" />

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as workspace from "./workspace";
import * as data from "./data";
import * as sui from "./sui";
import * as sounds from "./sounds";
import * as core from "./core";

type ISettingsProps = pxt.editor.ISettingsProps;
type TutorialOptions = pxt.editor.TutorialOptions;

export class TutorialMenuItem extends data.Component<ISettingsProps, {}> {
    constructor(props: ISettingsProps) {
        super(props);
    }

    openTutorialStep(step: number) {
        let options = this.props.parent.state.tutorialOptions;
        options.tutorialStep = step;
        pxt.tickEvent(`tutorial.step`, { tutorial: options.tutorial, step: step }, { interactiveConsent: true });
        this.props.parent.setTutorialStep(step);
    }

    render() {
        const { tutorialReady, tutorialStepInfo, tutorialStep, tutorialName } = this.props.parent.state.tutorialOptions;
        const state = this.props.parent.state;
        const targetTheme = pxt.appTarget.appTheme;
        const currentStep = tutorialStep;
        if (!tutorialReady) return <div />;

        return <div className="ui item">
            <div className="ui item tutorial-menuitem" role="menubar">
                {tutorialStepInfo.map((step, index) =>
                    (index == currentStep) ?
                        <span className="step-label" key={'tutorialStep' + index}>
                            <a className={`ui circular label ${currentStep == index ? 'blue selected' : 'inverted'} ${!tutorialReady ? 'disabled' : ''}`} role="menuitem" aria-label={lf("Tutorial step {0}. This is the current step", index + 1)} tabIndex={0} onClick={() => this.openTutorialStep(index)} onKeyDown={sui.fireClickOnEnter}>{index + 1}</a>
                        </span> :
                        <span className="step-label" key={'tutorialStep' + index} data-tooltip={`${index + 1}`} data-inverted="" data-position="bottom center">
                            <a className={`ui empty circular label ${!tutorialReady ? 'disabled' : ''} clear`} role="menuitem" aria-label={lf("Tutorial step {0}", index + 1)} tabIndex={0} onClick={() => this.openTutorialStep(index)} onKeyDown={sui.fireClickOnEnter}></a>
                        </span>
                )}
            </div>
        </div>;
    }
}

// This Component overrides shouldComponentUpdate, be sure to update that if the state is updated
export interface TutorialContentState {
    tutorialUrl: string;
}

export class TutorialContent extends data.Component<ISettingsProps, TutorialContentState> {
    public static notify(message: pxsim.SimulatorMessage) {
        let tc = document.getElementById("tutorialcontent") as HTMLIFrameElement;
        if (tc && tc.contentWindow) tc.contentWindow.postMessage(message, "*");
    }

    constructor(props: ISettingsProps) {
        super(props);
    }

    setPath(path: string) {
        const docsUrl = pxt.webConfig.docsUrl || '/--docs';
        const mode = this.props.parent.isBlocksEditor() ? "blocks" : "js";
        const url = `${docsUrl}#tutorial:${path}:${mode}:${pxt.Util.localeInfo()}`;
        this.setUrl(url);
    }

    private setUrl(url: string) {
        let el = document.getElementById("tutorialcontent") as HTMLIFrameElement;
        if (el) el.src = url;
        else this.setState({ tutorialUrl: url });
    }

    shouldComponentUpdate(nextProps: ISettingsProps, nextState: TutorialContentState, nextContext: any): boolean {
        return this.state.tutorialUrl != nextState.tutorialUrl;
    }

    public static refresh() {
        // Show light box
        sounds.tutorialStep();
        $('#root')
            .dimmer({
                'closable': true,
                onShow: () => {
                    document.getElementById('tutorialOkButton').focus();
                }
            })
            .dimmer('show');
    }

    renderCore() {
        const { tutorialUrl } = this.state;
        if (!tutorialUrl) return null;

        return <iframe id="tutorialcontent" style={{ "width": "1px", "height": "1px" }} src={tutorialUrl} role="complementary" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
    }
}

export interface TutorialHintState {
    visible: boolean;
}

export class TutorialHint extends data.Component<ISettingsProps, TutorialHintState> {

    constructor(props: ISettingsProps) {
        super(props);
    }

    showHint() {
        this.setState({ visible: true })
    }

    renderCore() {
        const { visible } = this.state;
        const options = this.props.parent.state.tutorialOptions;
        const { tutorialReady, tutorialStepInfo, tutorialStep, tutorialName } = options;
        if (!tutorialReady) return <div />;

        const step = tutorialStepInfo[tutorialStep];
        const tutorialHint = step.content;
        const tutorialFullscreen = step.fullscreen;
        const tutorialUnplugged = !!step.unplugged && tutorialStep < tutorialStepInfo.length - 1;

        const header = tutorialFullscreen ? (step.titleContent || tutorialName) : lf("Hint");

        const hide = () => this.setState({ visible: false });
        const next = () => {
            const nextStep = tutorialStep + 1;
            options.tutorialStep = nextStep;
            pxt.tickEvent(`tutorial.hint.next`, { tutorial: options.tutorial, step: nextStep });
            this.props.parent.setTutorialStep(nextStep);
        }

        const actions = [tutorialUnplugged ? {
            label: lf("Next"),
            onClick: next,
            icon: 'check',
            className: 'green'
        } : {
                label: lf("Ok"),
                onClick: hide,
                icon: 'check',
                className: 'green'
            }]

        return <sui.Modal open={visible} className="hintdialog" size="" longer={true} header={header} closeIcon={true}
            onClose={hide} dimmer={true}
            actions={actions}
            closeOnDimmerClick closeOnDocumentClick closeOnEscape>
            <div dangerouslySetInnerHTML={{ __html: tutorialHint }} />
        </sui.Modal>;
    }
}

export class TutorialCard extends data.Component<ISettingsProps, {}> {
    public focusInitialized: boolean;

    constructor(props: ISettingsProps) {
        super(props);
    }

    previousTutorialStep() {
        let options = this.props.parent.state.tutorialOptions;
        const currentStep = options.tutorialStep;
        const previousStep = currentStep - 1;

        options.tutorialStep = previousStep;

        pxt.tickEvent(`tutorial.previous`, { tutorial: options.tutorial, step: previousStep }, { interactiveConsent: true });
        this.props.parent.setTutorialStep(previousStep);
    }

    nextTutorialStep() {
        let options = this.props.parent.state.tutorialOptions;
        const currentStep = options.tutorialStep;
        const nextStep = currentStep + 1;

        options.tutorialStep = nextStep;

        pxt.tickEvent(`tutorial.next`, { tutorial: options.tutorial, step: nextStep }, { interactiveConsent: true });
        this.props.parent.setTutorialStep(nextStep);
    }

    finishTutorial() {
        this.closeLightbox();
        this.props.parent.completeTutorial();
    }

    closeLightboxOnEscape = (e: KeyboardEvent) => {
        let charCode = (typeof e.which == "number") ? e.which : e.keyCode
        if (charCode === 27) {
            this.closeLightbox();
        }
    }

    closeLightbox() {
        // Hide light box
        sounds.tutorialNext();
        document.documentElement.removeEventListener("keydown", this.closeLightboxOnEscape);
        core.initializeFocusTabIndex($('#tutorialcard').get(0), true, undefined, true);
        let tutorialmessage = document.getElementsByClassName("tutorialmessage");
        if (tutorialmessage.length > 0) {
            (tutorialmessage.item(0) as HTMLElement).focus();
        }
        $('#root')
            .dimmer('hide');
    }

    componentWillUpdate() {
        $('#tutorialhint')
            .modal('attach events', '#tutorialcard .ui.button.hintbutton', 'show');
        ;
        document.documentElement.addEventListener("keydown", this.closeLightboxOnEscape);
    }

    componentDidUpdate() {
        if (!this.focusInitialized) {
            let tutorialCard = document.getElementById('tutorialcard');
            if (tutorialCard !== null) {
                this.focusInitialized = true;
                core.initializeFocusTabIndex(tutorialCard, true, false);
            }
        }
    }

    showHint() {
        this.closeLightbox();
        this.props.parent.showTutorialHint();
    }

    render() {
        const options = this.props.parent.state.tutorialOptions;
        const { tutorialReady, tutorialStepInfo, tutorialStep } = options;
        if (!tutorialReady) return <div />
        const tutorialHeaderContent = tutorialStepInfo[tutorialStep].headerContent;
        let tutorialAriaLabel = tutorialStepInfo[tutorialStep].ariaLabel;

        const currentStep = tutorialStep;
        const maxSteps = tutorialStepInfo.length;
        const hasPrevious = tutorialReady && currentStep != 0;
        const hasNext = tutorialReady && currentStep != maxSteps - 1;
        const hasFinish = currentStep == maxSteps - 1;
        const hasHint = tutorialStepInfo[tutorialStep].hasHint;

        if (hasHint) {
            tutorialAriaLabel += lf("Press Space or Enter to show a hint.");
        }

        return <div id="tutorialcard" className={`ui ${tutorialReady ? 'tutorialReady' : ''}`} >
            <div className='ui buttons'>
                <div className="ui segment attached tutorialsegment">
                    <div className='avatar-image' onClick={() => this.showHint()} onKeyDown={sui.fireClickOnEnter}></div>
                    {hasHint ? <sui.Button class="mini blue hintbutton hidelightbox" text={lf("Hint")} tabIndex={-1} onClick={() => this.showHint()} onKeyDown={sui.fireClickOnEnter} /> : undefined}
                    <div className={`tutorialmessage ${hasHint ? 'focused' : undefined}`} role="alert" aria-label={tutorialAriaLabel} tabIndex={hasHint ? 0 : -1} onClick={() => { if (hasHint) this.showHint(); }} onKeyDown={sui.fireClickOnEnter}>
                        <div className="content" dangerouslySetInnerHTML={{ __html: tutorialHeaderContent }} />
                    </div>
                    <sui.Button id="tutorialOkButton" class="large green okbutton showlightbox focused" text={lf("Ok")} onClick={() => this.closeLightbox()} onKeyDown={sui.fireClickOnEnter} />
                </div>
                {hasNext ? <sui.Button icon="right chevron" rightIcon class={`nextbutton right attached green ${!hasNext ? 'disabled' : ''}`} text={lf("Next")} ariaLabel={lf("Go to the next step of the tutorial.")} onClick={() => this.nextTutorialStep()} onKeyDown={sui.fireClickOnEnter} /> : undefined}
                {hasFinish ? <sui.Button icon="left checkmark" class={`orange right attached ${!tutorialReady ? 'disabled' : 'focused'}`} text={lf("Finish")} ariaLabel={lf("Finish the tutorial.")} onClick={() => this.finishTutorial()} onKeyDown={sui.fireClickOnEnter} /> : undefined}
            </div>
        </div>;
    }
}