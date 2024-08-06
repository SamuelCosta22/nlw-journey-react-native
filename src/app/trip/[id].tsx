import { useEffect, useState } from "react";
import { Alert, Keyboard, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router"
import { Calendar as IconCalendar, CalendarRange, Info, MapPin, Settings2, User, Mail } from "lucide-react-native";
import { DateData } from "react-native-calendars";
import dayjs from "dayjs";

import { TripDetails, tripServer } from "@/server/trip-server";
import { participantsServer } from "@/server/participants-server";
import { calendarUtils, DatesSelected } from "@/utils/calendarUtils";
import { validateInput } from "@/utils/validateInput";

import { colors } from "@/styles/colors";

import { Loading } from "@/components/loading";
import { Input } from "@/components/input";
import { Button } from "@/components/button";
import { Modal } from "@/components/modal";
import { Calendar } from "@/components/calendar";

import { Activities } from "./activities";
import { Details } from "./details";
import { tripStorage } from "@/storage/trip";

export type TripData = TripDetails & { when: string }

enum MODAL{
    NONE = 0,
    UPDATE_TRIP = 1,
    CALENDAR = 2,
    CONFIRM_ATTENDANCE = 3,
}

export default function Trip(){
    //LOADING 
    const [isLoadingTrip, setIsLoadingTrip] = useState(true)
    const [isUpdatingTrip, setIsUpdatingTrip] = useState(false)
    const [isConfirmingAttendance, setIsConfirmingAttendance] = useState(false)

    //MODAL
    const [showModal, setShowModal] = useState(MODAL.NONE)

    //DATA
    const [tripDetails, setTripDetails] = useState({} as TripData)
    const [option, setOption] = useState<"activity" | "details">("activity")
    const [destination, setDestination] = useState("")
    const [selectedDates, setSelectedDates] = useState({} as DatesSelected)
    const [guestName, setGuestName] = useState("")
    const [guestEmail, setGuestEmail] = useState("")

    const tripParams = useLocalSearchParams<{ id: string, participant?: string }>()
    
    async function getTripDetails(){
        try{
            setIsLoadingTrip(true)

            if(tripParams.participant){
                setShowModal(MODAL.CONFIRM_ATTENDANCE)
            }

            if(!tripParams.id){
                return router.back()
            }

            const trip = await tripServer.getById(tripParams.id)

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
            if(!tripParams.id){
                return
            }

            if(!destination || !selectedDates.startsAt || !selectedDates.endsAt){
                return Alert.alert("Atualizar viagem", "Lembre-se, além de preencher o destino, selecione data de início e fim da viagem.")
            }

            setIsLoadingTrip(true)

            const updateStarts_at = dayjs(selectedDates.startsAt.dateString).toString()
            const updateEnds_at = dayjs(selectedDates.endsAt.dateString).toString()
            await tripServer.update({ id: tripParams.id, destination, starts_at: updateStarts_at, ends_at: updateEnds_at })
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
    
    async function handleConfirmAttendance(){
        try{
            if(!tripParams.participant || !tripParams.id){
                return
            }
            if(!guestName.trim() || !guestEmail.trim()){
                return Alert.alert("Confirmação", "Preencha nome e e-mail para confirmar a viagem!")
            }
            if(!validateInput.email(guestEmail.trim())){
                return Alert.alert("Confirmação", "E-mail inválido!")
            }

            setIsConfirmingAttendance(true)

            await participantsServer.confirmTripByParticipantId({
                participantId: tripParams.participant,
                name: guestName,
                email: guestEmail.trim()
            })

            Alert.alert("Confirmação", "Viagem confirmada com sucesso!")
            await tripStorage.save(tripParams.id)

            setShowModal(MODAL.NONE)

        } catch(error){
            console.log(error)
            Alert.alert("Confirmação", "Não foi possível confirmar sua presença!")
        } finally{
            setIsConfirmingAttendance(false)
        }
    }

    async function handleRemoveTrip(){
        try{
            Alert.alert("Remover viagem", "Tem certeza que deseja remover a viagem?", [
                {
                    text: "Não",
                    style: "cancel"
                },
                {
                    text: "Sim",
                    onPress: async() => {
                        await tripStorage.remove()
                        router.navigate("/")
                    }
                }
            ])
        } catch(error){
            console.log(error)
        }
    }

    useEffect(() => {
        getTripDetails()
    }, [])
    
    if(isLoadingTrip){
        return <Loading />
    }

    return(
        <View className="flex-1 px-5 pt-16 mt-16">
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
                    <TouchableOpacity activeOpacity={0.8} onPress={handleRemoveTrip}>
                        <Text className="text-red-400 text-center mt-6">Remover Viagem</Text>
                    </TouchableOpacity>
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

            <Modal title="Confirmar presença" visible={showModal === MODAL.CONFIRM_ATTENDANCE}>
                <View className="gap-4 mt-4">
                    <Text className="text-zinc-400 font-regular leading-6 my-2">
                        Você foi convidado (a) para participar de uma viagem para{" "}
                        <Text className="font-semibold text-zinc-100">{tripDetails.destination}</Text> nas datas de{" "}
                        <Text className="font-semibold text-zinc-100">{dayjs(tripDetails.starts_at).format("DD")}/{dayjs(tripDetails.starts_at).format("MMM")}</Text> a{" "}
                        <Text className="font-semibold text-zinc-100">{dayjs(tripDetails.ends_at).format("DD")}/{dayjs(tripDetails.ends_at).format("MMM")}</Text>. {"\n\n"}
                        Para confirmar sua presença na viagem, preencha os dados abaixo:
                    </Text>
                    <Input variant="secondary">
                        <User color={colors.zinc[400]} size={20} />
                        <Input.Field placeholder="Seu nome completo" onChangeText={setGuestName} />
                    </Input>
                    <Input variant="secondary">
                        <Mail color={colors.zinc[400]} size={20} />
                        <Input.Field placeholder="E-mail de confirmação" onChangeText={setGuestEmail} />
                    </Input>
                    <Button isLoading={isConfirmingAttendance} onPress={handleConfirmAttendance}>
                        <Button.Title>Confirmar minha presença</Button.Title>
                    </Button>
                </View>

            </Modal>
        </View>
    )
}