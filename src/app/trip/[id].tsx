import { useEffect, useState } from "react";
import { Alert, Keyboard, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router"
import { Calendar as IconCalendar, CalendarRange, Info, MapPin, Settings2 } from "lucide-react-native";
import dayjs from "dayjs";

import { TripDetails, tripServer } from "@/server/trip-server";
import { colors } from "@/styles/colors";

import { Loading } from "@/components/loading";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";

import { Activities } from "./activities";
import { Details } from "./details";
import { Calendar } from "@/components/calendar";
import { DateData } from "react-native-calendars";
import { calendarUtils, DatesSelected } from "@/utils/calendarUtils";

export type TripData = TripDetails & { when: string }

enum MODAL{
    NONE = 0,
    UPDATE_TRIP = 1,
    CALENDAR = 2,
}

export default function Trip(){
    //LOADING 
    const [isLoadingTrip, setIsLoadingTrip] = useState(true)
    const [isUpdatingTrip, setIsUpdatingTrip] = useState(false)

    //MODAL
    const [showModal, setShowModal] = useState(MODAL.NONE)

    //DATA
    const [tripDetails, setTripDetails] = useState({} as TripData)
    const [option, setOption] = useState<"activity" | "details">("activity")
    const [destination, setDestination] = useState("")
    const [selectedDates, setSelectedDates] = useState({} as DatesSelected)

    const tripId = useLocalSearchParams<{ id: string }>().id
    
    async function getTripDetails(){
        try{
            setIsLoadingTrip(true)

            if(!tripId){
                return router.back()
            }

            const trip = await tripServer.getById(tripId)

            //Formating data from trip
            const maxLengthDestination = 10
            const destination = trip.destination.length > maxLengthDestination ? trip.destination.slice(0, maxLengthDestination) + "..." : trip.destination
            const starts_at = dayjs(trip.starts_at).format("DD")
            const ends_at = dayjs(trip.ends_at).format("DD")
            const startMonth = dayjs(trip.starts_at).format("MMM")
            const endMonth = dayjs(trip.ends_at).format("MMM")

            setDestination(trip.destination)

            setTripDetails({
                ...trip,
                when: `${destination} | ${starts_at}/${startMonth} - ${ends_at}/${endMonth}`,
            })

        } catch (error) {
            console.log(error)
        } finally {
            setIsLoadingTrip(false)
        }
    }

    function handleSelectDate(selectedDay: DateData){
        const dates = calendarUtils.orderStartsAtAndEndsAt({
            startsAt: selectedDates.startsAt,
            endsAt: selectedDates.endsAt,
            selectedDay,
        })
        setSelectedDates(dates)
    }

    async function handleUpdateTrip(){
        try{
            if(!tripId){
                return
            }

            if(!destination || !selectedDates.startsAt || !selectedDates.endsAt){
                return Alert.alert("Atualizar viagem", "Lembre-se, além de preencher o destino, selecione data de início e fim da viagem.")
            }

            setIsLoadingTrip(true)

            const updateStarts_at = dayjs(selectedDates.startsAt.dateString).toString()
            const updateEnds_at = dayjs(selectedDates.endsAt.dateString).toString()
            await tripServer.update({ id: tripId, destination, starts_at: updateStarts_at, ends_at: updateEnds_at })
            setShowModal(MODAL.NONE)

            Alert.alert("Atualizar viagem", "Viagem atualizada com sucesso!", [
                {
                    text: "OK",
                    onPress: () => {
                        setShowModal(MODAL.NONE)
                        getTripDetails()
                    },
                }
            ])

        } catch(error) {
            console.log(error)
        } finally {
            setIsLoadingTrip(false)
        }
    }
    
    useEffect(() => {
        getTripDetails()
    }, [])
    
    if(isLoadingTrip){
        return <Loading />
    }

    return(
        <View className="flex-1 px-5 pt-16">
            <Input variant="tertiary">
                <MapPin color={colors.zinc[400]} size={20} />
                <Input.Field value={tripDetails.when} readOnly />
                <View className="w-9 h-9 bg-zinc-800 justify-center items-center rounded">
                    <TouchableOpacity activeOpacity={0.6} onPress={() => setShowModal(MODAL.UPDATE_TRIP)}>
                        <Settings2 color={colors.zinc[400]} size={20} />
                    </TouchableOpacity>
                </View>
            </Input>

            { option === "activity" ? (
                <Activities tripDetails={tripDetails} />
            ) : (
                <Details tripId={tripDetails.id} />
            )}

            <View className="w-full absolute -bottom-1 self-center justify-end pb-5 z-10 bg-zinc-950">
                <View className="w-full flex flex-row bg-zinc-900 p-4 rounded-lg border border-zinc-800 gap-2">

                    <View className="flex-1">
                        <Button variant={option === "activity" ? "primary" : "secondary"} onPress={() => setOption("activity")}>
                            <CalendarRange color={option === "activity" ? colors.lime[950] : colors.zinc[200]} size={20} />
                            <Button.Title>Atividades</Button.Title>
                        </Button>
                    </View>
                    <View className="flex-1">
                        <Button variant={option === "details" ? "primary" : "secondary"} onPress={() => setOption("details")}>
                            <Info color={option === "details" ? colors.lime[950] : colors.zinc[200]} size={20} />
                            <Button.Title>Detalhes</Button.Title>
                        </Button>
                    </View>
                </View>
            </View>

            <Modal title="Atualizar viagem" subtitle="Somente quem criou a viagem pode editar." visible={showModal === MODAL.UPDATE_TRIP} onClose={() => setShowModal(MODAL.NONE)}>
                <View className="gap-2 my-4">
                    <Input variant="secondary">
                        <MapPin color={colors.zinc[400]} size={20} />
                        <Input.Field placeholder="Para onde?" onChangeText={setDestination} value={destination} />
                    </Input>
                    <Input variant="secondary">
                        <IconCalendar color={colors.zinc[400]} size={20} />
                        <Input.Field placeholder="Quando" onChangeText={setDestination} value={selectedDates.formatDatesInText} onPressIn={() => setShowModal(MODAL.CALENDAR)} onFocus={() => Keyboard.dismiss()} />
                    </Input>
                    <Button onPress={handleUpdateTrip} isLoading={isUpdatingTrip}>
                        <Button.Title>Atualizar dados</Button.Title>
                    </Button>
                </View>
            </Modal>

            <Modal title='Selecionar datas' subtitle='Selecione a data de ida e volta da viagem' visible={showModal === MODAL.CALENDAR} onClose={() => setShowModal(MODAL.NONE)}>
                <View className='gap-4 mt-4'>
                    <Calendar onDayPress={date => handleSelectDate(date)} markedDates={selectedDates.dates} minDate={dayjs().toISOString()} />
                    <Button onPress={() => setShowModal(MODAL.UPDATE_TRIP)}>
                        <Button.Title>Confirmar</Button.Title>
                    </Button>
                </View>
            </Modal>
        </View>
    )
}