import React, { forwardRef, useEffect, useMemo, useState } from 'react'
import { Keyboard, TextInput, TouchableOpacity, View, NativeSyntheticEvent, TextInputFocusEventData } from 'react-native'
import CountryFlag from './CountryFlag'
import CountryPicker from './CountryPicker'
import dialCodes, { DialCode } from './assets/dialCodes'
import { findDialCode, normalize } from './utils'

const PNF = require('google-libphonenumber').PhoneNumberFormat
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance()

export interface PhoneInputProps {
    ref?: any
    children?: any
    initialCountry?: string
    value?: string
    style?: object
    textStyle?: object
    dismissKeyboard?: boolean
    autoFocus?: boolean
    onChange?(data: PhoneInputChangeEvent): void
    onChangePhoneNumber?(phoneNumber: string): void
    onFocus?(event: NativeSyntheticEvent<TextInputFocusEventData>): void
    onBlur?(event: NativeSyntheticEvent<TextInputFocusEventData>): void
    
    // Bilal: added the following statement 
    rtl?: boolean
}

export interface PhoneInputChangeEvent {
    input: string
    dialCode: string | null
    countryCode: string | null
    isValid: boolean
    e164: string | null
}

const PhoneInput = forwardRef(({
    initialCountry = 'US',
    value,
    style = {},
    textStyle = {},
    dismissKeyboard = true,
    autoFocus = false,
    onChange = () => {},
    onChangePhoneNumber = () => {},
    onFocus,
    onBlur, 
    
    // Bilal: added the following statement 
    rtl?: boolean
}: PhoneInputProps, ref) => {

    const initialDialCode = useMemo(() => dialCodes.find(dc => initialCountry && dc.countryCode === initialCountry.toUpperCase()), [])
    const [ dialCode, setDialCode ] = useState<DialCode | undefined>(initialDialCode)
    const [ phoneNumber, setPhoneNumber ] = useState(initialDialCode?.dialCode ?? '')
    const [ countryPickerVisible, setCountryPickerVisible ] = useState(false)

    useEffect(() => {
        if (value && value.length) {
            handleChangeText(value)
        }
    }, [ value ])

    const isValidNumber = (number: string, country: string): boolean => {
        const obj = phoneUtil.parse(number, country)
        return phoneUtil.isValidNumber(obj)
    }

    const handleChangeText = (input: string): void => {
        input = normalize(input)
        let dc = findDialCode(input)
        if (!dc && !input.startsWith('+') && !input.startsWith('00')) {
            dc = initialDialCode
            if (dc && input.length >= 2) {
                input = dc.dialCode + input.replace(/^0+/, '')
            }
        }
        setDialCode(dc) // update flag icon
        setPhoneNumber(input)
        const number = dc ? dc.dialCode + input.split(dc.dialCode).join('') : input
        if (onChangePhoneNumber) onChangePhoneNumber(number)
        emitChange(number, dc)
    }

    const emitChange = (number: string, dialCode?: DialCode): void => {
        if (onChange) {
            const event: PhoneInputChangeEvent = {
                input: number,
                dialCode: null,
                countryCode: null,
                isValid: false,
                e164: null
            }
            if (dialCode) {
                event.dialCode = dialCode.dialCode
                event.countryCode = dialCode.countryCode
                let obj = undefined
                try { obj = phoneUtil.parse(number, dialCode.countryCode) } catch { }
                if (obj) {
                    event.isValid = obj ? isValidNumber(number, dialCode.countryCode) : false
                    event.e164 = event.isValid ? phoneUtil.format(obj, PNF.E164) : null
                }
            }
            if (event.isValid && dismissKeyboard) Keyboard.dismiss()
            onChange(event)
        }
    }

    const openCountryPicker = (): void => {
        Keyboard.dismiss()
        setCountryPickerVisible(true)
    }

    const handleSelect = (newDialCode: DialCode): void => {
        let number = phoneNumber
        if (dialCode) number = number.split(dialCode.dialCode).join('')
        setDialCode(newDialCode)
        handleChangeText(newDialCode.dialCode + number)
        setCountryPickerVisible(false)
    }

    // Bilal: moved this component from the return statement to a constant here
   const countryComponent = 
       <TouchableOpacity
          style={{ flexDirection: 'row' }}
          onPress={openCountryPicker}
        >
             <CountryFlag dialCode={dialCode} />
        </TouchableOpacity>;
       
    // Bilal: moved this component from the return statement to a constant here
    const phoneComponent = 
        <TextInput
           dataDetectorTypes={['phoneNumber']}
           keyboardType={'phone-pad'}
           onChangeText={handleChangeText}
           autoFocus={autoFocus}
           value={phoneNumber}
           onFocus={onFocus}
           onBlur={onBlur}
           style={[{
             borderWidth: 0,
             flexGrow: 1,
             height: 40,
             paddingLeft: 0
           },textStyle]} />;
    
    return (
        <>
            <View ref={ref as any} style={[{
                borderColor: '#eeeeee',
                flexDirection: 'row'
            },style]}>
                {/* Bilal: when RTL is not set, we display the components in the default order */}
                {!rtl && (countryComponent)}
                {!rtl && (phoneComponent)}

                {/* Bilal: when RTL is set, we display the components in the default order */}
                {rtl && (phoneComponent)}
                {rtl && (countryComponent)}
            </View>
            <CountryPicker
                visible={countryPickerVisible}
                onSelect={handleSelect}
                onRequestClose={() => setCountryPickerVisible(false)}
            />
        </>
    )

})

export default PhoneInput
