import classNames from 'classnames'
import Controls from 'Components/Controls'
import InputSuggestions from 'Components/conversation/InputSuggestions'
import PeriodSwitch from 'Components/PeriodSwitch'
import withColours from 'Components/utils/withColours'
import withLanguage from 'Components/utils/withLanguage'
import withSitePaths from 'Components/utils/withSitePaths'
import { encodeRuleName, findRuleByDottedName } from 'Engine/rules'
import { compose, propEq } from 'ramda'
import React, { Component } from 'react'
import { withTranslation } from 'react-i18next'
import { connect } from 'react-redux'
import { withRouter } from 'react-router'
import { Link } from 'react-router-dom'
import { change, Field, formValueSelector, reduxForm } from 'redux-form'
import {
	analysisWithDefaultsSelector,
	blockingInputControlsSelector,
	flatRulesSelector,
	nextStepsSelector,
	noUserInputSelector
} from 'Selectors/analyseSelectors'
import Animate from 'Ui/animate'
import AnimatedTargetValue from 'Ui/AnimatedTargetValue'
import { Progress } from '../sites/mycompanyinfrance.fr/layout/ProgressHeader/ProgressHeader'
import CurrencyInput from './CurrencyInput/CurrencyInput'
import QuickLinks from './QuickLinks'
import './TargetSelection.css'

const MAX_NUMBER_QUESTION = 18
export default compose(
	withTranslation(),
	withColours,
	reduxForm({
		form: 'conversation',
		destroyOnUnmount: false
	}),
	withRouter,
	connect(
		state => ({
			getTargetValue: dottedName =>
				formValueSelector('conversation')(state, dottedName),
			analysis: analysisWithDefaultsSelector(state),
			blockingInputControls: blockingInputControlsSelector(state),
			flatRules: flatRulesSelector(state),
			progress:
				(100 * (MAX_NUMBER_QUESTION - nextStepsSelector(state))) /
				MAX_NUMBER_QUESTION,
			noUserInput: noUserInputSelector(state),
			conversationStarted: state.conversationStarted,
			activeInput: state.activeTargetInput,
			objectifs: state.simulation?.config.objectifs || []
		}),
		dispatch => ({
			setFormValue: (field, name) =>
				dispatch(change('conversation', field, name)),
			setActiveInput: name =>
				dispatch({ type: 'SET_ACTIVE_TARGET_INPUT', name })
		})
	)
)(
	class TargetSelection extends Component {
		render() {
			let { colours, analysis, progress } = this.props

			return (
				<div id="targetSelection">
					<QuickLinks />
					<Controls controls={analysis.controls} />
					<div style={{height: '10px'}}><Progress percent={progress}/></div>
					<section
						className="ui__ plain card"
						style={{
							color: colours.textColour,
							background: `linear-gradient(
							60deg,
							${colours.darkColour} 0%,
							${colours.colour} 100%
						)`
						}}>
						{this.renderOutputList()}
					</section>
					<PeriodSwitch />
				</div>
			)
		}

		renderOutputList() {
			let displayedTargets = this.props.objectifs.map(target =>
					findRuleByDottedName(this.props.flatRules, target)
				),
				{
					conversationStarted,
					activeInput,
					setActiveInput,
					analysis,
					noUserInput,
					blockingInputControls,
					match
				} = this.props,
				targets = analysis ? analysis.targets : []

			return (
				<div>
					<ul id="targets">
						{displayedTargets.map(target => (
							<li key={target.name}>
								<div className="main">
									<Header
										{...{
											match,
											target,
											conversationStarted,
											isActiveInput: activeInput === target.dottedName,
											blockingInputControls
										}}
									/>
									<TargetInputOrValue
										{...{
											target,
											targets,
											activeInput,
											setActiveInput,
											setFormValue: this.props.setFormValue,
											noUserInput,
											blockingInputControls
										}}
									/>
								</div>
								{activeInput === target.dottedName && !conversationStarted && (
									<Animate.fromTop>
										<InputSuggestions
											suggestions={target.suggestions}
											onFirstClick={value =>
												this.props.setFormValue(target.dottedName, '' + value)
											}
											rulePeriod={target.période}
											colouredBackground={true}
										/>
									</Animate.fromTop>
								)}
							</li>
						))}
					</ul>
				</div>
			)
		}
	}
)

let Header = withSitePaths(({ target, conversationStarted, sitePaths }) => {
	const ruleLink =
		sitePaths.documentation.index + '/' + encodeRuleName(target.dottedName)
	return (
		<span className="header">
			<span className="texts">
				<span className="optionTitle">
					<Link to={ruleLink}>{target.title || target.name}</Link>
				</span>
				{!conversationStarted && <p>{target['résumé']}</p>}
			</span>
		</span>
	)
})

let CurrencyField = withColours(props => {
	return (
		<CurrencyInput
			style={{
				color: props.colours.textColour,
				borderColor: props.colours.textColour
			}}
			className="targetInput"
			autoFocus
			{...props.input}
			{...props}
		/>
	)
})

let TargetInputOrValue = withLanguage(
	({
		target,
		targets,
		activeInput,
		setActiveInput,
		language,
		noUserInput,
		blockingInputControls
	}) => (
		<span className="targetInputOrValue">
			{activeInput === target.dottedName ? (
				<Field
					name={target.dottedName}
					component={CurrencyField}
					language={language}
				/>
			) : (
				<TargetValue
					{...{
						targets,
						target,
						activeInput,
						setActiveInput,
						noUserInput,
						blockingInputControls
					}}
				/>
			)}
		</span>
	)
)

const TargetValue = connect(
	null,
	dispatch => ({
		setFormValue: (field, name) => dispatch(change('conversation', field, name))
	})
)(
	class TargetValue extends Component {
		render() {
			let { targets, target, noUserInput, blockingInputControls } = this.props

			let targetWithValue =
					targets && targets.find(propEq('dottedName', target.dottedName)),
				value = targetWithValue && targetWithValue.nodeValue

			return (
				<div
					className={classNames({
						editable: target.question,
						attractClick:
							target.question && (noUserInput || blockingInputControls)
					})}
					tabIndex="0"
					onClick={this.showField(value)}
					onFocus={this.showField(value)}>
					<AnimatedTargetValue value={value} />
				</div>
			)
		}
		showField(value) {
			let { target, setFormValue, activeInput, setActiveInput } = this.props
			return () => {
				if (!target.question) return
				if (value != null)
					setFormValue(target.dottedName, Math.floor(value) + '')

				if (activeInput) setFormValue(activeInput, '')
				setActiveInput(target.dottedName)
			}
		}
	}
)
